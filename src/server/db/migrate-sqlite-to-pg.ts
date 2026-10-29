import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { getPostgresClient, PostgresClient } from './postgres.ts';

export interface MigrationSummary {
  success: boolean;
  backupPath: string | null;
  timestamp: string;
  tables: Record<string, { sqliteCount: number; pgCount: number; match: boolean }>;
  allParityVerified: boolean;
  message: string;
}

export async function runSqliteToPostgresMigration(
  customPgClient?: PostgresClient,
  customSqlitePath?: string
): Promise<MigrationSummary> {
  const sqliteFile = customSqlitePath || path.resolve(process.cwd(), 'data', 'almotaheda.db');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${sqliteFile}.backup.${timestamp}`;

  const summary: MigrationSummary = {
    success: false,
    backupPath: null,
    timestamp: new Date().toISOString(),
    tables: {},
    allParityVerified: false,
    message: '',
  };

  if (!fs.existsSync(sqliteFile)) {
    summary.message = `SQLite database not found at ${sqliteFile}. Nothing to migrate.`;
    summary.success = true;
    summary.allParityVerified = true;
    return summary;
  }

  // 1. Create an immutable backup of SQLite database before touching anything
  fs.copyFileSync(sqliteFile, backupPath);
  summary.backupPath = backupPath;
  console.log(`📦 [Migration] Created SQLite backup at: ${backupPath}`);

  const sqlite = new Database(sqliteFile, { readonly: true });
  const pg = customPgClient || getPostgresClient();

  // 2. Read and apply the complete PostgreSQL schema
  const schemaPath = path.resolve(process.cwd(), 'prisma', 'migrations', '001_initial_schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
  await pg.exec(schemaSql);
  console.log('✅ [Migration] PostgreSQL schema DDL applied successfully.');

  // 3. Migrate tables in strict dependency order
  await pg.transaction(async (tx) => {
    // CATEGORIES
    const categories = sqlite.prepare('SELECT * FROM categories').all() as any[];
    for (const c of categories) {
      await tx.query(
        `INSERT INTO categories (id, slug, name_ar, name_en, icon, display_order, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           slug = EXCLUDED.slug, name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en,
           icon = EXCLUDED.icon, display_order = EXCLUDED.display_order, is_active = EXCLUDED.is_active`,
        [c.id, c.slug, c.name_ar, c.name_en || null, c.icon || null, c.display_order, Boolean(c.is_active)]
      );
    }

    // PRODUCTS
    const products = sqlite.prepare('SELECT * FROM products').all() as any[];
    for (const p of products) {
      await tx.query(
        `INSERT INTO products (
          id, slug, title_ar, title_en, description_ar, description_en, sku, category_id,
          brand, base_price, cost_price, stock_quantity, low_stock_threshold, voltage,
          wattage, amperage, warranty, cable_specs, is_active, images_json, variants_json,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
        ) ON CONFLICT (id) DO UPDATE SET
          slug = EXCLUDED.slug, title_ar = EXCLUDED.title_ar, title_en = EXCLUDED.title_en,
          description_ar = EXCLUDED.description_ar, description_en = EXCLUDED.description_en,
          sku = EXCLUDED.sku, category_id = EXCLUDED.category_id, brand = EXCLUDED.brand,
          base_price = EXCLUDED.base_price, cost_price = EXCLUDED.cost_price,
          stock_quantity = EXCLUDED.stock_quantity, low_stock_threshold = EXCLUDED.low_stock_threshold,
          voltage = EXCLUDED.voltage, wattage = EXCLUDED.wattage, amperage = EXCLUDED.amperage,
          warranty = EXCLUDED.warranty, cable_specs = EXCLUDED.cable_specs, is_active = EXCLUDED.is_active,
          images_json = EXCLUDED.images_json, variants_json = EXCLUDED.variants_json,
          updated_at = EXCLUDED.updated_at`,
        [
          p.id, p.slug, p.title_ar, p.title_en || null, p.description_ar, p.description_en || null,
          p.sku, p.category_id, p.brand, p.base_price, p.cost_price || null, p.stock_quantity,
          p.low_stock_threshold, p.voltage || null, p.wattage || null, p.amperage || null,
          p.warranty || null, p.cable_specs || null, Boolean(p.is_active),
          p.images_json || '[]', p.variants_json || '[]',
          p.created_at || new Date().toISOString(), p.updated_at || new Date().toISOString()
        ]
      );
    }

    // PROMOTIONS
    const promotions = sqlite.prepare('SELECT * FROM promotions').all() as any[];
    for (const pr of promotions) {
      await tx.query(
        `INSERT INTO promotions (
          id, title_ar, discount_type, discount_value, start_date, end_date,
          is_active, priority, eligible_product_ids_json, allocated_stock, used_stock
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          title_ar = EXCLUDED.title_ar, discount_type = EXCLUDED.discount_type,
          discount_value = EXCLUDED.discount_value, start_date = EXCLUDED.start_date,
          end_date = EXCLUDED.end_date, is_active = EXCLUDED.is_active, priority = EXCLUDED.priority,
          eligible_product_ids_json = EXCLUDED.eligible_product_ids_json,
          allocated_stock = EXCLUDED.allocated_stock, used_stock = EXCLUDED.used_stock`,
        [
          pr.id, pr.title_ar, pr.discount_type, pr.discount_value, pr.start_date, pr.end_date,
          Boolean(pr.is_active), pr.priority, pr.eligible_product_ids_json || '[]',
          pr.allocated_stock ?? null, pr.used_stock ?? 0
        ]
      );
    }

    // DELIVERY ZONES
    const zones = sqlite.prepare('SELECT * FROM delivery_zones').all() as any[];
    for (const z of zones) {
      await tx.query(
        `INSERT INTO delivery_zones (id, name_ar, name_en, default_fee, mode, is_active, allow_fallback, sub_zones_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en, default_fee = EXCLUDED.default_fee,
           mode = EXCLUDED.mode, is_active = EXCLUDED.is_active, allow_fallback = EXCLUDED.allow_fallback,
           sub_zones_json = EXCLUDED.sub_zones_json`,
        [z.id, z.name_ar, z.name_en || null, z.default_fee, z.mode, Boolean(z.is_active), Boolean(z.allow_fallback), z.sub_zones_json || '[]']
      );
    }

    // BRANCHES
    const branches = sqlite.prepare('SELECT * FROM branches').all() as any[];
    for (const b of branches) {
      await tx.query(
        `INSERT INTO branches (id, name_ar, address_ar, phone, working_hours_ar, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           name_ar = EXCLUDED.name_ar, address_ar = EXCLUDED.address_ar, phone = EXCLUDED.phone,
           working_hours_ar = EXCLUDED.working_hours_ar, is_active = EXCLUDED.is_active`,
        [b.id, b.name_ar, b.address_ar, b.phone, b.working_hours_ar, Boolean(b.is_active)]
      );
    }

    // ORDERS
    const orders = sqlite.prepare('SELECT * FROM orders').all() as any[];
    for (const o of orders) {
      await tx.query(
        `INSERT INTO orders (
          id, order_number, customer_name, customer_phone, email, fulfillment_method,
          governorate, district, address_details, delivery_instructions, branch_id,
          branch_name, subtotal, discount_total, shipping_fee, final_total, currency,
          order_status, payment_status, payment_method, guest_access_token_hash,
          created_at, updated_at, notes_json, cancellation_reason
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
        ) ON CONFLICT (id) DO UPDATE SET
          order_status = EXCLUDED.order_status, payment_status = EXCLUDED.payment_status,
          updated_at = EXCLUDED.updated_at, notes_json = EXCLUDED.notes_json,
          cancellation_reason = EXCLUDED.cancellation_reason`,
        [
          o.id, o.order_number, o.customer_name, o.customer_phone, o.email || null,
          o.fulfillment_method, o.governorate || null, o.district || null,
          o.address_details || null, o.delivery_instructions || null,
          o.branch_id || null, o.branch_name || null, o.subtotal, o.discount_total,
          o.shipping_fee, o.final_total, o.currency || 'EGP', o.order_status,
          o.payment_status, o.payment_method, o.guest_access_token_hash,
          o.created_at, o.updated_at, o.notes_json || '[]', o.cancellation_reason || null
        ]
      );
    }

    // ORDER ITEMS
    const orderItems = sqlite.prepare('SELECT * FROM order_items').all() as any[];
    for (const oi of orderItems) {
      await tx.query(
        `INSERT INTO order_items (id, order_id, product_id, variant_id, title_ar, sku, quantity, unit_price, discount, line_total)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO NOTHING`,
        [oi.id, oi.order_id, oi.product_id, oi.variant_id || null, oi.title_ar, oi.sku, oi.quantity, oi.unit_price, oi.discount, oi.line_total]
      );
    }

    // INVENTORY RESERVATIONS
    const reservations = sqlite.prepare('SELECT * FROM inventory_reservations').all() as any[];
    for (const r of reservations) {
      await tx.query(
        `INSERT INTO inventory_reservations (id, product_id, variant_id, order_id, quantity, expires_at, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status, expires_at = EXCLUDED.expires_at`,
        [r.id, r.product_id, r.variant_id || null, r.order_id, r.quantity, r.expires_at, r.status]
      );
    }

    // INVENTORY MOVEMENTS
    const movements = sqlite.prepare('SELECT * FROM inventory_movements').all() as any[];
    for (const m of movements) {
      await tx.query(
        `INSERT INTO inventory_movements (id, product_id, type, quantity, order_id, reason, actor, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [m.id, m.product_id, m.type, m.quantity, m.order_id || null, m.reason, m.actor, m.timestamp]
      );
    }

    // PAYMOB TRANSACTIONS
    const paymobTxs = sqlite.prepare('SELECT * FROM paymob_transactions').all() as any[];
    for (const pt of paymobTxs) {
      await tx.query(
        `INSERT INTO paymob_transactions (transaction_id, order_id, amount_cents, currency, success, created_at, raw_payload_redacted)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (transaction_id) DO NOTHING`,
        [pt.transaction_id, pt.order_id, pt.amount_cents, pt.currency, Boolean(pt.success), pt.created_at, pt.raw_payload_redacted || null]
      );
    }

    // ADMIN USERS
    const admins = sqlite.prepare('SELECT * FROM admin_users').all() as any[];
    for (const a of admins) {
      await tx.query(
        `INSERT INTO admin_users (id, username, password_hash, salt, full_name, role, phone, is_active, failed_login_attempts, locked_until)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (username) DO UPDATE SET
           password_hash = EXCLUDED.password_hash, salt = EXCLUDED.salt, full_name = EXCLUDED.full_name,
           role = EXCLUDED.role, phone = EXCLUDED.phone, is_active = EXCLUDED.is_active,
           failed_login_attempts = EXCLUDED.failed_login_attempts, locked_until = EXCLUDED.locked_until`,
        [a.id, a.username, a.password_hash, a.salt, a.full_name, a.role, a.phone, Boolean(a.is_active), a.failed_login_attempts, a.locked_until]
      );
    }

    // ADMIN SESSIONS
    const sessions = sqlite.prepare('SELECT * FROM admin_sessions').all() as any[];
    for (const s of sessions) {
      await tx.query(
        `INSERT INTO admin_sessions (session_id, username, full_name, role, created_at, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (session_id) DO UPDATE SET expires_at = EXCLUDED.expires_at`,
        [s.session_id, s.username, s.full_name, s.role, s.created_at, s.expires_at]
      );
    }

    // OTP CHALLENGES
    const otpChallenges = sqlite.prepare('SELECT * FROM otp_challenges').all() as any[];
    for (const oc of otpChallenges) {
      await tx.query(
        `INSERT INTO otp_challenges (challenge_id, username, otp_hash, expires_at, attempts, max_attempts, is_used)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (challenge_id) DO NOTHING`,
        [oc.challenge_id, oc.username, oc.otp_hash, oc.expires_at, oc.attempts, oc.max_attempts, Boolean(oc.is_used)]
      );
    }

    // RECOVERY CODES
    const recoveryCodes = sqlite.prepare('SELECT * FROM recovery_codes').all() as any[];
    for (const rc of recoveryCodes) {
      await tx.query(
        `INSERT INTO recovery_codes (id, username, code_hash, is_used, used_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [rc.id, rc.username, rc.code_hash, Boolean(rc.is_used), rc.used_at || null, rc.created_at]
      );
    }

    // AUDIT LOGS
    const auditLogs = sqlite.prepare('SELECT * FROM audit_logs').all() as any[];
    for (const al of auditLogs) {
      await tx.query(
        `INSERT INTO audit_logs (id, timestamp, actor, role, action, entity, entity_id, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        [al.id, al.timestamp, al.actor, al.role, al.action, al.entity, al.entity_id, al.details, al.ip_address || null]
      );
    }

    // GUEST RATE LIMITS
    const limits = sqlite.prepare('SELECT * FROM guest_rate_limits').all() as any[];
    for (const gl of limits) {
      await tx.query(
        `INSERT INTO guest_rate_limits (identifier, count, first_attempt_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (identifier) DO UPDATE SET count = EXCLUDED.count, first_attempt_at = EXCLUDED.first_attempt_at`,
        [gl.identifier, gl.count, gl.first_attempt_at]
      );
    }
  });

  // 4. Parity verification across all tables
  const tableNames = [
    'categories', 'products', 'promotions', 'delivery_zones', 'branches',
    'orders', 'order_items', 'inventory_reservations', 'inventory_movements',
    'paymob_transactions', 'admin_users', 'admin_sessions', 'otp_challenges',
    'recovery_codes', 'audit_logs', 'guest_rate_limits'
  ];

  let allMatched = true;
  for (const table of tableNames) {
    const sCount = (sqlite.prepare(`SELECT COUNT(*) as cnt FROM ${table}`).get() as any).cnt;
    const pgRes = await pg.query(`SELECT COUNT(*) as cnt FROM ${table}`);
    const pCount = parseInt((pgRes.rows[0] as any).cnt, 10);
    const match = sCount === pCount;
    if (!match) allMatched = false;
    summary.tables[table] = { sqliteCount: sCount, pgCount: pCount, match };
  }

  summary.allParityVerified = allMatched;
  summary.success = allMatched;
  summary.message = allMatched
    ? 'All tables migrated and record counts 100% verified.'
    : 'Discrepancy detected during table count verification.';

  sqlite.close();
  return summary;
}
