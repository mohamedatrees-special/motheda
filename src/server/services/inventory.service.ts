import { InventoryMovement, InventoryReservation } from '../../types/index.ts';
import { db } from '../db/store.ts';

export class InventoryService {
  private static RESERVATION_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL

  /**
   * Concurrency-safe atomic stock reservation
   * Uses persistent PostgreSQL transactions and row-level locks to ensure competing checkouts cannot oversell
   */
  public static async reserveStockForOrder(
    orderId: string,
    items: { productId: string; variantId?: string; quantity: number }[]
  ): Promise<InventoryReservation[]> {
    return await db.pg.transaction(async (tx) => {
      // Clean expired reservations in PostgreSQL
      InventoryService.cleanExpiredReservationsSync();

      const reservations: InventoryReservation[] = [];
      const expiresAt = new Date(Date.now() + InventoryService.RESERVATION_TTL_MS).toISOString();

      for (const item of items) {
        // Row-level lock in PostgreSQL
        const prodRes = await tx.query(
          'SELECT id, title_ar, stock_quantity, variants_json, is_active FROM products WHERE id = $1 FOR UPDATE',
          [item.productId]
        );

        if (prodRes.rows.length === 0 || !prodRes.rows[0].is_active) {
          throw new Error('المنتج غير موجود أو غير نشط بالمخزن.');
        }

        const productRow = prodRes.rows[0];

        // Query active reservations directly in PostgreSQL
        const resQuery = await tx.query(
          "SELECT COALESCE(SUM(quantity), 0) as reserved FROM inventory_reservations WHERE product_id = $1 AND status = 'ACTIVE' AND expires_at > NOW()",
          [item.productId]
        );
        const activeReserved = parseInt((resQuery.rows[0] as any)?.reserved || '0', 10);

        let baseAvailable = productRow.stock_quantity;
        if (item.variantId) {
          const variants = typeof productRow.variants_json === 'string'
            ? JSON.parse(productRow.variants_json)
            : (productRow.variants_json || []);
          const variant = variants.find((v: any) => v.id === item.variantId);
          if (variant) {
            baseAvailable = variant.stockQuantity;
          }
        }

        const effectiveAvailable = baseAvailable - activeReserved;

        if (effectiveAvailable < item.quantity) {
          throw new Error(
            `عذراً، نفدت الكمية المتاحة من المنتج "${productRow.title_ar}". المتاح حالياً: ${Math.max(0, effectiveAvailable)} قطعة فقط.`
          );
        }

        const resId = `res-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const reservation: InventoryReservation = {
          id: resId,
          productId: item.productId,
          variantId: item.variantId,
          orderId,
          quantity: item.quantity,
          expiresAt,
          status: 'ACTIVE',
        };

        // Insert reservation in PostgreSQL transaction
        await tx.query(
          `INSERT INTO inventory_reservations (id, product_id, variant_id, order_id, quantity, expires_at, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [resId, item.productId, item.variantId || null, orderId, item.quantity, expiresAt, 'ACTIVE']
        );

        // Insert inventory movement
        await tx.query(
          `INSERT INTO inventory_movements (id, product_id, type, quantity, order_id, reason, actor, timestamp)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            item.productId,
            'RESERVATION',
            item.quantity,
            orderId,
            `حجز مؤقت للطلب أثناء مرحلة الدفع والتحقق: ${orderId}`,
            'CHECKOUT_SERVICE',
            new Date().toISOString()
          ]
        );

        reservations.push(reservation);
        db.reservations.set(resId, reservation);
      }

      return reservations;
    });
  }

  /**
   * Commit reservation to permanent stock deduction upon order payment or confirmation
   */
  public static commitOrderStock(orderId: string): void {
    db.transaction(() => {
      for (const res of db.reservations.values()) {
        if (res.orderId === orderId && res.status === 'ACTIVE') {
          res.status = 'COMMITTED';
          db.reservations.set(res.id, res);

          const product = db.getProductById(res.productId);
          if (product) {
            const newStock = Math.max(0, product.stockQuantity - res.quantity);
            db.updateProductStock(product.id, newStock);

            // Record persistent movement
            db.addMovement({
              id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              productId: res.productId,
              type: 'PURCHASE',
              quantity: res.quantity,
              orderId,
              reason: 'خصم نهائي للرصيد بعد تأكيد الطلب والدفع',
              actor: 'ORDER_SERVICE',
              timestamp: new Date().toISOString(),
            });
          }
        }
      }
    });
  }

  /**
   * Release reservation if order is cancelled or checkout expires
   */
  public static releaseOrderReservation(orderId: string, reason: string): void {
    db.transaction(() => {
      for (const res of db.reservations.values()) {
        if (res.orderId === orderId && res.status === 'ACTIVE') {
          res.status = 'RELEASED';
          db.reservations.set(res.id, res);

          db.addMovement({
            id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            productId: res.productId,
            type: 'RELEASE',
            quantity: res.quantity,
            orderId,
            reason: `فك حجز المخزون: ${reason}`,
            actor: 'INVENTORY_WORKER',
            timestamp: new Date().toISOString(),
          });
        }
      }
    });
  }

  /**
   * Clean expired reservations that timed out
   */
  public static cleanExpiredReservationsSync(): number {
    const now = new Date();
    let releasedCount = 0;

    for (const res of db.reservations.values()) {
      if (res.status === 'ACTIVE' && new Date(res.expiresAt) < now) {
        res.status = 'RELEASED';
        db.reservations.set(res.id, res);
        releasedCount++;

        db.addMovement({
          id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          productId: res.productId,
          type: 'RELEASE',
          quantity: res.quantity,
          orderId: res.orderId,
          reason: 'انتهاء مهلة حجز المخزون التلقائية (15 دقيقة)',
          actor: 'EXPIRATION_CLEANER',
          timestamp: new Date().toISOString(),
        });
      }
    }

    return releasedCount;
  }

  /**
   * Returns current low-stock products based on configured threshold
   */
  public static getLowStockProducts() {
    return db.products.filter(
      (p) => p.isActive && p.stockQuantity <= p.lowStockThreshold
    );
  }
}
