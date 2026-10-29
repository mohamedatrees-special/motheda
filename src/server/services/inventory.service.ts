import { InventoryMovement, InventoryReservation } from '../../types/index.ts';
import { db } from '../db/store.ts';

export class InventoryService {
  private static RESERVATION_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL

  /**
   * Concurrency-safe atomic stock reservation
   * Uses persistent SQLite transactions to ensure competing checkouts cannot oversell
   */
  public static async reserveStockForOrder(
    orderId: string,
    items: { productId: string; variantId?: string; quantity: number }[]
  ): Promise<InventoryReservation[]> {
    return db.transaction(() => {
      // First clean any expired reservations
      InventoryService.cleanExpiredReservationsSync();

      const reservations: InventoryReservation[] = [];
      const expiresAt = new Date(Date.now() + InventoryService.RESERVATION_TTL_MS).toISOString();

      // Check availability for all items under the lock
      for (const item of items) {
        const product = db.getProductById(item.productId);
        if (!product || !product.isActive) {
          throw new Error(`المنتج غير موجود أو غير نشط بالمخزن.`);
        }

        // Calculate currently active reserved quantity from persistent reservations
        let activeReserved = 0;
        for (const res of db.reservations.values()) {
          if (
            res.status === 'ACTIVE' &&
            res.productId === item.productId &&
            res.variantId === item.variantId
          ) {
            activeReserved += res.quantity;
          }
        }

        let baseAvailable = product.stockQuantity;
        if (item.variantId && product.variants) {
          const variant = product.variants.find((v) => v.id === item.variantId);
          if (variant) {
            baseAvailable = variant.stockQuantity;
          }
        }

        const effectiveAvailable = baseAvailable - activeReserved;

        if (effectiveAvailable < item.quantity) {
          throw new Error(
            `عذراً، نفدت الكمية المتاحة من المنتج "${product.titleAr}". المتاح حالياً: ${Math.max(0, effectiveAvailable)} قطعة فقط.`
          );
        }
      }

      // If all items pass, create the reservations atomically in database
      for (const item of items) {
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

        db.reservations.set(resId, reservation);
        reservations.push(reservation);

        // Record persistent movement
        db.addMovement({
          id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          productId: item.productId,
          type: 'RESERVATION',
          quantity: item.quantity,
          orderId,
          reason: 'حجز مؤقت للطلب أثناء مرحلة الدفع والتحقق',
          actor: 'CHECKOUT_SERVICE',
          timestamp: new Date().toISOString(),
        });
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
