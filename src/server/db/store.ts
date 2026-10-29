import crypto from 'crypto';
import {
  AdminRole,
  AdminUser,
  AuditLog,
  Branch,
  Category,
  DeliverySubZone,
  DeliveryZone,
  InventoryMovement,
  InventoryReservation,
  Order,
  OrderItem,
  OTPChallenge,
  PaymentAttempt,
  Product,
  ProductVariant,
  Promotion,
} from '../../types/index.ts';
import { sqlite } from './database.ts';

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

export class DatabaseStore {
  /**
   * Run a function inside a persistent SQLite transaction
   */
  public transaction<T>(fn: () => T): T {
    return sqlite.transaction(fn)();
  }

  /**
   * Acquire lock / transaction wrapper for concurrency safety
   */
  public async acquireLock<T>(fn: () => Promise<T> | T): Promise<T> {
    // In better-sqlite3, transactions and write operations are strictly serialized
    return await fn();
  }

  // ==========================================
  // CATEGORIES
  // ==========================================
  public get categories(): Category[] {
    const rows = sqlite.prepare('SELECT * FROM categories ORDER BY display_order ASC').all() as any[];
    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      nameAr: r.name_ar,
      nameEn: r.name_en || undefined,
      icon: r.icon || undefined,
      displayOrder: r.display_order,
      isActive: Boolean(r.is_active),
    }));
  }

  // ==========================================
  // PRODUCTS
  // ==========================================
  public get products(): Product[] {
    const rows = sqlite.prepare('SELECT * FROM products').all() as any[];
    return rows.map((r) => this.mapProduct(r));
  }

  public getProductById(id: string): Product | null {
    const row = sqlite.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;
    return row ? this.mapProduct(row) : null;
  }

  public getProductBySku(sku: string): Product | null {
    const row = sqlite.prepare('SELECT * FROM products WHERE sku = ?').get(sku) as any;
    return row ? this.mapProduct(row) : null;
  }

  public saveProduct(p: Product): void {
    const stmt = sqlite.prepare(`
      INSERT INTO products (
        id, slug, title_ar, title_en, description_ar, sku, category_id, brand,
        base_price, cost_price, stock_quantity, low_stock_threshold, voltage,
        wattage, amperage, warranty, cable_specs, is_active, images_json, variants_json,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title_ar = excluded.title_ar,
        title_en = excluded.title_en,
        description_ar = excluded.description_ar,
        sku = excluded.sku,
        category_id = excluded.category_id,
        brand = excluded.brand,
        base_price = excluded.base_price,
        cost_price = excluded.cost_price,
        stock_quantity = excluded.stock_quantity,
        low_stock_threshold = excluded.low_stock_threshold,
        voltage = excluded.voltage,
        wattage = excluded.wattage,
        amperage = excluded.amperage,
        warranty = excluded.warranty,
        cable_specs = excluded.cable_specs,
        is_active = excluded.is_active,
        images_json = excluded.images_json,
        variants_json = excluded.variants_json,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      p.id,
      p.slug,
      p.titleAr,
      p.titleEn || null,
      p.descriptionAr,
      p.sku,
      p.categoryId,
      p.brand,
      p.basePrice,
      p.costPrice || null,
      p.stockQuantity,
      p.lowStockThreshold,
      p.voltage || null,
      p.wattage || null,
      p.amperage || null,
      p.warranty || null,
      p.cableSpecs || null,
      p.isActive ? 1 : 0,
      JSON.stringify(p.images || []),
      JSON.stringify(p.variants || []),
      p.createdAt || new Date().toISOString(),
      p.updatedAt || new Date().toISOString()
    );
  }

  public updateProductStock(productId: string, newStock: number): void {
    sqlite.prepare('UPDATE products SET stock_quantity = ?, updated_at = ? WHERE id = ?').run(
      newStock,
      new Date().toISOString(),
      productId
    );
  }

  private mapProduct(r: any): Product {
    return {
      id: r.id,
      slug: r.slug,
      titleAr: r.title_ar,
      titleEn: r.title_en || undefined,
      descriptionAr: r.description_ar,
      descriptionEn: r.description_en || undefined,
      sku: r.sku,
      categoryId: r.category_id,
      brand: r.brand,
      basePrice: r.base_price,
      costPrice: r.cost_price || undefined,
      stockQuantity: r.stock_quantity,
      lowStockThreshold: r.low_stock_threshold,
      voltage: r.voltage || undefined,
      wattage: r.wattage || undefined,
      amperage: r.amperage || undefined,
      warranty: r.warranty || undefined,
      cableSpecs: r.cable_specs || undefined,
      isActive: Boolean(r.is_active),
      images: JSON.parse(r.images_json || '[]'),
      variants: JSON.parse(r.variants_json || '[]'),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  // ==========================================
  // PROMOTIONS
  // ==========================================
  public get promotions(): Promotion[] {
    const rows = sqlite.prepare('SELECT * FROM promotions WHERE is_active = 1').all() as any[];
    return rows.map((r) => ({
      id: r.id,
      titleAr: r.title_ar,
      discountType: r.discount_type as any,
      discountValue: r.discount_value,
      startDate: r.start_date,
      endDate: r.end_date,
      isActive: Boolean(r.is_active),
      priority: r.priority,
      eligibleProductIds: JSON.parse(r.eligible_product_ids_json || '[]'),
      allocatedStock: r.allocated_stock ?? undefined,
      usedStock: r.used_stock,
    }));
  }

  // ==========================================
  // DELIVERY ZONES & BRANCHES
  // ==========================================
  public get deliveryZones(): DeliveryZone[] {
    const rows = sqlite.prepare('SELECT * FROM delivery_zones').all() as any[];
    return rows.map((r) => ({
      id: r.id,
      nameAr: r.name_ar,
      nameEn: r.name_en || undefined,
      defaultFee: r.default_fee,
      mode: r.mode as any,
      isActive: Boolean(r.is_active),
      allowFallbackToDefault: Boolean(r.allow_fallback),
      subZones: JSON.parse(r.sub_zones_json || '[]'),
    }));
  }

  public updateDeliveryZone(id: string, defaultFee: number, mode: 'FLAT' | 'DISTRICT'): void {
    sqlite.prepare('UPDATE delivery_zones SET default_fee = ?, mode = ? WHERE id = ?').run(
      defaultFee,
      mode,
      id
    );
  }

  public get branches(): Branch[] {
    const rows = sqlite.prepare('SELECT * FROM branches WHERE is_active = 1').all() as any[];
    return rows.map((r) => ({
      id: r.id,
      nameAr: r.name_ar,
      addressAr: r.address_ar,
      phone: r.phone,
      workingHoursAr: r.working_hours_ar,
      isActive: Boolean(r.is_active),
    }));
  }

  // ==========================================
  // ORDERS (Map-like facade for compatibility)
  // ==========================================
  public orders = {
    get: (id: string): Order | undefined => {
      const row = sqlite.prepare('SELECT * FROM orders WHERE id = ? OR order_number = ?').get(id, id) as any;
      if (!row) return undefined;
      const itemRows = sqlite.prepare('SELECT * FROM order_items WHERE order_id = ?').all(row.id) as any[];
      return {
        id: row.id,
        orderNumber: row.order_number,
        customerName: row.customer_name,
        customerPhone: row.customer_phone,
        email: row.email || undefined,
        fulfillmentMethod: row.fulfillment_method as any,
        governorate: row.governorate || undefined,
        district: row.district || undefined,
        addressDetails: row.address_details || undefined,
        deliveryInstructions: row.delivery_instructions || undefined,
        branchId: row.branch_id || undefined,
        branchName: row.branch_name || undefined,
        subtotal: row.subtotal,
        discountTotal: row.discount_total,
        shippingFee: row.shipping_fee,
        finalTotal: row.final_total,
        currency: row.currency as any,
        orderStatus: row.order_status as any,
        paymentStatus: row.payment_status as any,
        paymentMethod: row.payment_method as any,
        guestAccessTokenHash: row.guest_access_token_hash,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        notes: JSON.parse(row.notes_json || '[]'),
        cancellationReason: row.cancellation_reason || undefined,
        items: itemRows.map((i) => ({
          id: i.id,
          productId: i.product_id,
          variantId: i.variant_id || undefined,
          titleAr: i.title_ar,
          sku: i.sku,
          quantity: i.quantity,
          unitPrice: i.unit_price,
          discount: i.discount,
          lineTotal: i.line_total,
        })),
      };
    },
    set: (id: string, order: Order): void => {
      sqlite.transaction(() => {
        const stmt = sqlite.prepare(`
          INSERT INTO orders (
            id, order_number, customer_name, customer_phone, email, fulfillment_method,
            governorate, district, address_details, delivery_instructions, branch_id,
            branch_name, subtotal, discount_total, shipping_fee, final_total, currency,
            order_status, payment_status, payment_method, guest_access_token_hash,
            created_at, updated_at, notes_json, cancellation_reason
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            order_status = excluded.order_status,
            payment_status = excluded.payment_status,
            updated_at = excluded.updated_at,
            cancellation_reason = excluded.cancellation_reason,
            notes_json = excluded.notes_json
        `);

        stmt.run(
          order.id,
          order.orderNumber,
          order.customerName,
          order.customerPhone,
          order.email || null,
          order.fulfillmentMethod,
          order.governorate || null,
          order.district || null,
          order.addressDetails || null,
          order.deliveryInstructions || null,
          order.branchId || null,
          order.branchName || null,
          order.subtotal,
          order.discountTotal,
          order.shippingFee,
          order.finalTotal,
          order.currency,
          order.orderStatus,
          order.paymentStatus,
          order.paymentMethod,
          order.guestAccessTokenHash,
          order.createdAt,
          order.updatedAt,
          JSON.stringify(order.notes || []),
          order.cancellationReason || null
        );

        // Insert items
        const itemStmt = sqlite.prepare(`
          INSERT OR REPLACE INTO order_items (
            id, order_id, product_id, variant_id, title_ar, sku, quantity, unit_price, discount, line_total
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const item of order.items) {
          itemStmt.run(
            item.id,
            order.id,
            item.productId,
            item.variantId || null,
            item.titleAr,
            item.sku,
            item.quantity,
            item.unitPrice,
            item.discount,
            item.lineTotal
          );
        }
      })();
    },
    values: (): Order[] => {
      const rows = sqlite.prepare('SELECT * FROM orders ORDER BY created_at DESC').all() as any[];
      return rows.map((r) => {
        const itemRows = sqlite.prepare('SELECT * FROM order_items WHERE order_id = ?').all(r.id) as any[];
        return {
          id: r.id,
          orderNumber: r.order_number,
          customerName: r.customer_name,
          customerPhone: r.customer_phone,
          email: r.email || undefined,
          fulfillmentMethod: r.fulfillment_method as any,
          governorate: r.governorate || undefined,
          district: r.district || undefined,
          addressDetails: r.address_details || undefined,
          deliveryInstructions: r.delivery_instructions || undefined,
          branchId: r.branch_id || undefined,
          branchName: r.branch_name || undefined,
          subtotal: r.subtotal,
          discountTotal: r.discount_total,
          shippingFee: r.shipping_fee,
          finalTotal: r.final_total,
          currency: r.currency as any,
          orderStatus: r.order_status as any,
          paymentStatus: r.payment_status as any,
          paymentMethod: r.payment_method as any,
          guestAccessTokenHash: r.guest_access_token_hash,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          notes: JSON.parse(r.notes_json || '[]'),
          cancellationReason: r.cancellation_reason || undefined,
          items: itemRows.map((i) => ({
            id: i.id,
            productId: i.product_id,
            variantId: i.variant_id || undefined,
            titleAr: i.title_ar,
            sku: i.sku,
            quantity: i.quantity,
            unitPrice: i.unit_price,
            discount: i.discount,
            lineTotal: i.line_total,
          })),
        };
      });
    },
    get size(): number {
      const res = sqlite.prepare('SELECT COUNT(*) as cnt FROM orders').get() as { cnt: number };
      return res.cnt;
    },
  };

  // ==========================================
  // INVENTORY RESERVATIONS & MOVEMENTS
  // ==========================================
  public reservations = {
    get: (id: string): InventoryReservation | undefined => {
      const r = sqlite.prepare('SELECT * FROM inventory_reservations WHERE id = ?').get(id) as any;
      if (!r) return undefined;
      return {
        id: r.id,
        productId: r.product_id,
        variantId: r.variant_id || undefined,
        orderId: r.order_id,
        quantity: r.quantity,
        expiresAt: r.expires_at,
        status: r.status as any,
      };
    },
    set: (id: string, res: InventoryReservation): void => {
      sqlite.prepare(`
        INSERT INTO inventory_reservations (id, product_id, variant_id, order_id, quantity, expires_at, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET status = excluded.status, expires_at = excluded.expires_at
      `).run(
        res.id,
        res.productId,
        res.variantId || null,
        res.orderId,
        res.quantity,
        res.expiresAt,
        res.status
      );
    },
    values: (): InventoryReservation[] => {
      const rows = sqlite.prepare('SELECT * FROM inventory_reservations').all() as any[];
      return rows.map((r) => ({
        id: r.id,
        productId: r.product_id,
        variantId: r.variant_id || undefined,
        orderId: r.order_id,
        quantity: r.quantity,
        expiresAt: r.expires_at,
        status: r.status as any,
      }));
    },
  };

  public get movements(): InventoryMovement[] {
    const rows = sqlite.prepare('SELECT * FROM inventory_movements ORDER BY timestamp DESC').all() as any[];
    return rows.map((r) => ({
      id: r.id,
      productId: r.product_id,
      type: r.type as any,
      quantity: r.quantity,
      orderId: r.order_id || undefined,
      reason: r.reason,
      actor: r.actor,
      timestamp: r.timestamp,
    }));
  }

  public addMovement(m: InventoryMovement): void {
    sqlite.prepare(`
      INSERT INTO inventory_movements (id, product_id, type, quantity, order_id, reason, actor, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      m.id,
      m.productId,
      m.type,
      m.quantity,
      m.orderId || null,
      m.reason,
      m.actor,
      m.timestamp
    );
  }

  // ==========================================
  // PAYMOB TRANSACTIONS (IDEMPOTENCY)
  // ==========================================
  public processedWebhookEvents = {
    has: (txId: string): boolean => {
      const row = sqlite.prepare('SELECT 1 FROM paymob_transactions WHERE transaction_id = ?').get(txId);
      return Boolean(row);
    },
    add: (txId: string, orderId?: string, amountCents?: number, currency?: string, success?: boolean, rawRedacted?: string): void => {
      sqlite.prepare(`
        INSERT OR IGNORE INTO paymob_transactions (transaction_id, order_id, amount_cents, currency, success, created_at, raw_payload_redacted)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        txId,
        orderId || 'UNKNOWN',
        amountCents || 0,
        currency || 'EGP',
        success ? 1 : 0,
        new Date().toISOString(),
        rawRedacted || null
      );
    },
  };

  public paymentAttempts = new Map<string, PaymentAttempt>();

  // ==========================================
  // AUDIT LOGS
  // ==========================================
  public get auditLogs(): AuditLog[] {
    const rows = sqlite.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC').all() as any[];
    return rows.map((r) => ({
      id: r.id,
      timestamp: r.timestamp,
      actor: r.actor,
      role: r.role,
      action: r.action,
      entity: r.entity,
      entityId: r.entity_id,
      details: r.details,
      ipAddress: r.ip_address || undefined,
    }));
  }

  public addAuditLog(log: AuditLog): void {
    sqlite.prepare(`
      INSERT INTO audit_logs (id, timestamp, actor, role, action, entity, entity_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      log.id,
      log.timestamp,
      log.actor,
      log.role,
      log.action,
      log.entity,
      log.entityId,
      log.details,
      log.ipAddress || null
    );
  }

  // ==========================================
  // ADMIN USERS, SESSIONS & RECOVERY
  // ==========================================
  public get adminUsers() {
    return {
      get: (username: string): AdminUser | undefined => {
        const row = sqlite.prepare('SELECT * FROM admin_users WHERE username = ?').get(username) as any;
        if (!row) return undefined;
        return {
          id: row.id,
          username: row.username,
          passwordHash: row.password_hash,
          salt: row.salt,
          fullName: row.full_name,
          role: row.role as AdminRole,
          phone: row.phone,
          isActive: Boolean(row.is_active),
          recoveryCodeHash: '', // Hidden for security
        };
      },
    };
  }

  public verifyAdminPassword(username: string, passwordAttempt: string): { success: boolean; locked?: boolean; remainingMinutes?: number } {
    const user = sqlite.prepare('SELECT * FROM admin_users WHERE username = ?').get(username) as any;
    if (!user || !user.is_active) return { success: false };

    // Check account lockout
    const now = Date.now();
    if (user.locked_until && user.locked_until > now) {
      const remainingMinutes = Math.ceil((user.locked_until - now) / (60 * 1000));
      return { success: false, locked: true, remainingMinutes };
    }

    const computed = hashPassword(passwordAttempt, user.salt);
    const isMatch = crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(user.password_hash));

    if (isMatch) {
      // Reset failed attempts on success
      sqlite.prepare('UPDATE admin_users SET failed_login_attempts = 0, locked_until = 0 WHERE username = ?').run(username);
      return { success: true };
    } else {
      // Increment failed attempts and lock out if threshold reached
      const newAttempts = user.failed_login_attempts + 1;
      let lockTime = 0;
      if (newAttempts >= 5) {
        lockTime = now + 15 * 60 * 1000; // 15-minute lock
      }
      sqlite.prepare('UPDATE admin_users SET failed_login_attempts = ?, locked_until = ? WHERE username = ?').run(
        newAttempts,
        lockTime,
        username
      );
      return { success: false, locked: newAttempts >= 5, remainingMinutes: 15 };
    }
  }

  public verifySingleUseRecoveryCode(username: string, rawCode: string): boolean {
    const codeHash = crypto.createHash('sha256').update(rawCode.trim()).digest('hex');
    const row = sqlite.prepare(`
      SELECT id FROM recovery_codes
      WHERE username = ? AND code_hash = ? AND is_used = 0
    `).get(username, codeHash) as { id: string } | undefined;

    if (!row) {
      return false;
    }

    // Mark as used atomically so it can never be used again!
    sqlite.prepare('UPDATE recovery_codes SET is_used = 1, used_at = ? WHERE id = ?').run(
      new Date().toISOString(),
      row.id
    );
    return true;
  }

  // ==========================================
  // SESSIONS
  // ==========================================
  public saveSession(session: { sessionId: string; username: string; fullName: string; role: string; createdAt: number; expiresAt: number }): void {
    sqlite.prepare(`
      INSERT INTO admin_sessions (session_id, username, full_name, role, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET expires_at = excluded.expires_at
    `).run(
      session.sessionId,
      session.username,
      session.fullName,
      session.role,
      session.createdAt,
      session.expiresAt
    );
  }

  public getSession(sessionId: string): { sessionId: string; username: string; fullName: string; role: AdminRole; createdAt: number; expiresAt: number } | null {
    const row = sqlite.prepare('SELECT * FROM admin_sessions WHERE session_id = ?').get(sessionId) as any;
    if (!row) return null;
    if (Date.now() > row.expires_at) {
      sqlite.prepare('DELETE FROM admin_sessions WHERE session_id = ?').run(sessionId);
      return null;
    }
    return {
      sessionId: row.session_id,
      username: row.username,
      fullName: row.full_name,
      role: row.role as AdminRole,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    };
  }

  public deleteSession(sessionId: string): void {
    sqlite.prepare('DELETE FROM admin_sessions WHERE session_id = ?').run(sessionId);
  }

  // ==========================================
  // OTP CHALLENGES
  // ==========================================
  public otpChallenges = {
    get: (challengeId: string): OTPChallenge | undefined => {
      const r = sqlite.prepare('SELECT * FROM otp_challenges WHERE challenge_id = ?').get(challengeId) as any;
      if (!r) return undefined;
      return {
        challengeId: r.challenge_id,
        username: r.username,
        otpHash: r.otp_hash,
        expiresAt: r.expires_at,
        attempts: r.attempts,
        maxAttempts: r.max_attempts,
        channel: 'WHATSAPP',
      };
    },
    set: (challengeId: string, chal: OTPChallenge): void => {
      sqlite.prepare(`
        INSERT INTO otp_challenges (challenge_id, username, otp_hash, expires_at, attempts, max_attempts)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(challenge_id) DO UPDATE SET attempts = excluded.attempts, expires_at = excluded.expires_at
      `).run(
        chal.challengeId,
        chal.username,
        chal.otpHash,
        chal.expiresAt,
        chal.attempts,
        chal.maxAttempts
      );
    },
    delete: (challengeId: string): void => {
      sqlite.prepare('DELETE FROM otp_challenges WHERE challenge_id = ?').run(challengeId);
    },
  };

  // ==========================================
  // GUEST RATE LIMITS
  // ==========================================
  public guestRateLimits = {
    get: (identifier: string): { count: number; firstAttemptAt: number } | undefined => {
      const r = sqlite.prepare('SELECT count, first_attempt_at FROM guest_rate_limits WHERE identifier = ?').get(identifier) as any;
      if (!r) return undefined;
      return { count: r.count, firstAttemptAt: r.first_attempt_at };
    },
    set: (identifier: string, val: { count: number; firstAttemptAt: number }): void => {
      sqlite.prepare(`
        INSERT INTO guest_rate_limits (identifier, count, first_attempt_at)
        VALUES (?, ?, ?)
        ON CONFLICT(identifier) DO UPDATE SET count = excluded.count, first_attempt_at = excluded.first_attempt_at
      `).run(identifier, val.count, val.firstAttemptAt);
    },
  };
}

export const db = new DatabaseStore();
