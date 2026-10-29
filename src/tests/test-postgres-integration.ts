import crypto from 'crypto';
import path from 'path';
import { initializeDatabase } from '../server/db/database.ts';
import { getPostgresClient, resetPostgresClientForTesting } from '../server/db/postgres.ts';
import { db } from '../server/db/store.ts';
import { InventoryService } from '../server/services/inventory.service.ts';
import { OrderService } from '../server/services/order.service.ts';
import { PaymobService } from '../server/services/paymob.service.ts';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${testName} ${details ? `(${details})` : ''}`);
  }
}

async function runPostgresIntegrationSuite() {
  console.log('\n======================================================');
  console.log('🐘 AL-MOTAHEDA — POSTGRESQL PRODUCTION INTEGRATION SUITE');
  console.log('======================================================\n');

  // 1. Initialize PostgreSQL
  console.log('📦 1. Testing PostgreSQL Initialization & Engine Verification:');
  {
    const pg = await initializeDatabase();
    await db.loadFromPostgres();

    assert(pg.isPostgres === true, 'Database engine is genuine PostgreSQL');
    assert(
      pg.engineType === 'PG_POOL' || pg.engineType === 'PGLITE',
      `PostgreSQL engine active: ${pg.engineType}`
    );

    const versionRes = await pg.query('SELECT 1 as alive');
    assert(versionRes.rows.length === 1 && (versionRes.rows[0] as any).alive === 1, 'PostgreSQL responds to live queries');
  }

  // 2. Schema DDL & Table Parity
  console.log('\n📋 2. Testing PostgreSQL Relational Schema & Tables:');
  {
    const tables = [
      'categories', 'products', 'promotions', 'delivery_zones', 'branches',
      'orders', 'order_items', 'inventory_reservations', 'inventory_movements',
      'paymob_transactions', 'admin_users', 'admin_sessions', 'otp_challenges',
      'recovery_codes', 'audit_logs', 'guest_rate_limits'
    ];

    for (const table of tables) {
      const res = await db.pg.query(`SELECT COUNT(*) as count FROM ${table}`);
      const count = parseInt((res.rows[0] as any).count, 10);
      assert(count >= 0, `Table "${table}" exists in PostgreSQL with valid row count (${count})`);
    }
  }

  // 3. Order Creation & Direct PostgreSQL Query Verification
  console.log('\n📝 3. Testing Order Creation & Direct PostgreSQL Persistence:');
  let testOrderId = '';
  {
    const orderPayload = {
      customerName: 'م. حسام الدين عبد الرحيم',
      customerPhone: '01012345678',
      email: 'hossam@electric-site.eg',
      fulfillmentMethod: 'SHIPPING' as const,
      zoneId: 'zone-cairo',
      subZoneId: 'sub-nasr-city',
      addressDetails: 'مشروع أبراج النزهة، عمارة 4، الدور الخامس',
      paymentMethod: 'PAYMOB_CARD' as const,
      items: [{ productId: 'prod-elsewedy-single-wire-2-5', quantity: 2 }],
    };

    const { order, guestAccessToken } = await OrderService.createOrder(orderPayload);
    testOrderId = order.id;

    // Direct SQL query against PostgreSQL table (bypassing in-memory cache)
    const directPgOrder = await db.pg.query('SELECT * FROM orders WHERE id = $1', [order.id]);
    assert(directPgOrder.rows.length === 1, 'Order row physically written to PostgreSQL "orders" table');

    const pgRow = directPgOrder.rows[0];
    assert(pgRow.customer_name === 'م. حسام الدين عبد الرحيم', 'Customer name persisted in PostgreSQL');
    assert(pgRow.customer_phone === '01012345678', 'Customer phone persisted in PostgreSQL');
    assert(pgRow.currency === 'EGP', 'Currency persisted as EGP in PostgreSQL');
    assert(Number(pgRow.final_total) === order.finalTotal, 'Final total correctly calculated and persisted in PostgreSQL');

    // Direct SQL query against order_items table in PostgreSQL
    const directPgItems = await db.pg.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
    assert(directPgItems.rows.length === 1, 'Order items physically written to PostgreSQL "order_items" table');
    assert(directPgItems.rows[0].product_id === 'prod-elsewedy-single-wire-2-5', 'Item product_id verified in PostgreSQL');
  }

  // 4. Application Restart Persistence Test
  console.log('\n🔄 4. Testing Data Persistence Across Simulated Application Restart:');
  {
    // Reload state from PostgreSQL directly into fresh store
    await db.loadFromPostgres();

    const orderAfterRestart = db.orders.get(testOrderId);
    assert(orderAfterRestart !== undefined, 'Order retrieved successfully after application state reload');
    assert(orderAfterRestart?.items.length === 1, 'Order items preserved with relational integrity after restart');
    assert(orderAfterRestart?.customerName === 'م. حسام الدين عبد الرحيم', 'Customer details intact after restart');
  }

  // 5. Concurrency & Overselling Prevention on PostgreSQL
  console.log('\n🔒 5. Testing PostgreSQL Row-Level Locking & Concurrency Race Condition:');
  {
    const concurrencyTestSku = 'prod-digital-multimeter-uni-t';
    // Set stock to strictly 1 item in PostgreSQL
    await db.pg.query('UPDATE products SET stock_quantity = 1 WHERE id = $1', [concurrencyTestSku]);
    await db.loadFromPostgres();

    // Verify stock is 1
    const pBefore = db.getProductById(concurrencyTestSku);
    assert(pBefore?.stockQuantity === 1, 'Test product stock set to 1 in PostgreSQL');

    let successCount = 0;
    let rejectedCount = 0;

    // Two customers attempt to buy the last remaining item simultaneously
    await Promise.all([
      InventoryService.reserveStockForOrder('pg-competing-order-1', [
        { productId: concurrencyTestSku, quantity: 1 }
      ])
        .then(() => successCount++)
        .catch(() => rejectedCount++),
      InventoryService.reserveStockForOrder('pg-competing-order-2', [
        { productId: concurrencyTestSku, quantity: 1 }
      ])
        .then(() => successCount++)
        .catch(() => rejectedCount++),
    ]);

    assert(successCount === 1, 'PostgreSQL atomic transaction allowed exactly ONE customer to reserve the last unit');
    assert(rejectedCount === 1, 'PostgreSQL atomic transaction strictly REJECTED the second customer (oversell prevented)');

    // Verify in PostgreSQL that only 1 ACTIVE reservation was inserted
    const activeRes = await db.pg.query(
      "SELECT COUNT(*) as count FROM inventory_reservations WHERE product_id = $1 AND status = 'ACTIVE' AND expires_at > NOW()",
      [concurrencyTestSku]
    );
    assert(parseInt((activeRes.rows[0] as any).count, 10) === 1, 'PostgreSQL records exactly 1 active reservation in relational table');

    // Clean up
    InventoryService.releaseOrderReservation('pg-competing-order-1', 'Clean up PostgreSQL concurrency test');
    await db.pg.query('UPDATE products SET stock_quantity = 3 WHERE id = $1', [concurrencyTestSku]);
    await db.loadFromPostgres();
  }

  // 6. Paymob Webhook Idempotency on PostgreSQL
  console.log('\n💳 6. Testing Paymob Webhook Idempotency in PostgreSQL:');
  {
    const txId = `tx-pg-test-${Date.now()}`;
    const hmacSecret = process.env.PAYMOB_HMAC_SECRET || 'test_hmac_secret_motaheda_2026';
    const targetOrder = db.orders.get(testOrderId)!;

    const webhookPayload = {
      id: 99912345,
      obj: {
        id: txId,
        amount_cents: Math.round(targetOrder.finalTotal * 100),
        currency: 'EGP',
        success: true,
        created_at: new Date().toISOString(),
        error_occured: false,
        has_parent_transaction: false,
        integration_id: 123456,
        is_3d_secure: true,
        is_auth: false,
        is_capture: false,
        is_refunded: false,
        is_standalone_payment: true,
        is_voided: false,
        order: {
          id: 888123,
          merchant_order_id: testOrderId,
        },
        owner: 1,
        pending: false,
        source_data: {
          pan: '**** **** **** 2346',
          sub_type: 'Card',
          type: 'Online',
        },
      },
    };

    const validHmac = PaymobService.calculatePaymobHmac(webhookPayload, hmacSecret);

    // First processing
    const firstCall = await PaymobService.processWebhook(webhookPayload, validHmac);
    assert(firstCall.success === true, 'First webhook call confirmed successfully');

    // Direct PostgreSQL query for transaction record
    const pgTx = await db.pg.query('SELECT * FROM paymob_transactions WHERE transaction_id = $1', [txId]);
    assert(pgTx.rows.length === 1, 'Transaction recorded in PostgreSQL "paymob_transactions" table');

    // Duplicate processing
    const secondCall = await PaymobService.processWebhook(webhookPayload, validHmac);
    assert(secondCall.success === true && secondCall.duplicate === true, 'Duplicate webhook detected and safely ignored');

    const pgTxAfter = await db.pg.query('SELECT COUNT(*) as count FROM paymob_transactions WHERE transaction_id = $1', [txId]);
    assert(parseInt((pgTxAfter.rows[0] as any).count, 10) === 1, 'PostgreSQL primary key constraint prevented duplicate transaction insertion');
  }

  // 7. Fail-Closed Production Guard Verification
  console.log('\n🛡️ 7. Testing Fail-Closed Production Security Guard (No Silent SQLite Fallback):');
  {
    const originalEnv = process.env.NODE_ENV;
    const originalUrl = process.env.DATABASE_URL;

    process.env.NODE_ENV = 'production';
    delete process.env.DATABASE_URL;

    let fatalErrorThrown = false;
    let errorMessage = '';

    try {
      resetPostgresClientForTesting(null);
      getPostgresClient();
    } catch (err: any) {
      fatalErrorThrown = true;
      errorMessage = err.message;
    } finally {
      process.env.NODE_ENV = originalEnv;
      if (originalUrl) process.env.DATABASE_URL = originalUrl;
      resetPostgresClientForTesting(db.pg);
    }

    assert(fatalErrorThrown === true, 'Production strictly throws fatal error if DATABASE_URL is missing');
    assert(
      errorMessage.includes('FATAL PRODUCTION CONFIGURATION ERROR') &&
      errorMessage.includes('Silent SQLite fallback is strictly prohibited'),
      'Production error message explicitly rejects silent SQLite fallback'
    );
  }

  console.log('\n======================================================');
  console.log(`📊 POSTGRESQL INTEGRATION SUMMARY: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runPostgresIntegrationSuite().catch((err) => {
  console.error('Fatal PostgreSQL integration test error:', err);
  process.exit(1);
});

