import Database from 'better-sqlite3';
import crypto from 'crypto';
import path from 'path';
import { db } from '../server/db/store.ts';
import { AuthService } from '../server/services/auth.service.ts';
import { InventoryService } from '../server/services/inventory.service.ts';
import { OrderService } from '../server/services/order.service.ts';
import { PaymobService } from '../server/services/paymob.service.ts';
import { PricingService } from '../server/services/pricing.service.ts';
import { ShippingService } from '../server/services/shipping.service.ts';

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

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('⚡ AL-MOTAHEDA ELECTRICAL SUPPLIES — REGRESSION & SECURITY SUITE');
  console.log('======================================================\n');

  // -------------------------------------------------------------------
  // 1. PRICING & PROMOTION ENGINE
  // -------------------------------------------------------------------
  console.log('📦 1. Testing Pricing & Promotion Engine:');
  {
    // Test Elsewedy wire (has 15% promotion)
    const result = PricingService.calculateOrderItems([
      { productId: 'prod-elsewedy-single-wire-2-5', quantity: 2 },
    ]);
    assert(result.subtotal === 3700, 'Subtotal calculation for 2 units (1850 * 2 = 3700)');
    assert(result.discountTotal > 0, 'Promotion discount applied for eligible Elsewedy wire');
    assert(result.finalItems.length === 1, 'Final items length is correct');
    assert(result.finalItems[0].lineTotal < result.subtotal, 'Line total is discounted correctly');

    // Test zero or negative quantity validation
    let caught = false;
    try {
      PricingService.calculateOrderItems([{ productId: 'prod-elsewedy-single-wire-2-5', quantity: 0 }]);
    } catch {
      caught = true;
    }
    assert(caught, 'Rejects zero quantity with error');
  }

  // -------------------------------------------------------------------
  // 2. DYNAMIC SHIPPING MATRIX
  // -------------------------------------------------------------------
  console.log('\n🚚 2. Testing Dynamic Shipping Matrix:');
  {
    // A. Cairo District Specific (Nasr City = 40 EGP)
    const cairoNasrCity = ShippingService.calculateShipping({
      fulfillmentMethod: 'DELIVERY',
      zoneId: 'zone-cairo',
      subZoneId: 'sub-nasr-city',
    });
    assert(cairoNasrCity.isAvailable === true, 'Nasr City delivery is available');
    assert(cairoNasrCity.shippingFee === 40, 'Nasr City shipping fee is 40 EGP');

    // B. Alexandria Flat Rate (60 EGP)
    const alexandria = ShippingService.calculateShipping({
      fulfillmentMethod: 'DELIVERY',
      zoneId: 'zone-alexandria',
    });
    assert(alexandria.isAvailable === true, 'Alexandria flat-rate delivery is available');
    assert(alexandria.shippingFee === 60, 'Alexandria flat-rate shipping is 60 EGP');

    // C. Cairo without district (Strict rejection when district is missing and fallback is false)
    const cairoMissingDistrict = ShippingService.calculateShipping({
      fulfillmentMethod: 'DELIVERY',
      zoneId: 'zone-cairo',
    });
    assert(cairoMissingDistrict.isAvailable === false, 'Rejects delivery when district is missing');

    // D. Pickup from active branch (0 EGP)
    const branchPickup = ShippingService.calculateShipping({
      fulfillmentMethod: 'PICKUP',
      branchId: 'branch-sabtiya',
    });
    assert(branchPickup.isAvailable === true, 'Branch pickup in Al-Sabtiya is available');
    assert(branchPickup.shippingFee === 0, 'Branch pickup fee is strictly 0 EGP');
    assert(branchPickup.branch?.nameAr.includes('السبتية') === true, 'Resolves correct branch details');
  }

  // -------------------------------------------------------------------
  // 3. INVENTORY CONCURRENCY & RESERVATION
  // -------------------------------------------------------------------
  console.log('\n🔒 3. Testing Inventory Concurrency & Reservation:');
  {
    const reservations = await InventoryService.reserveStockForOrder('test-ord-01', [
      { productId: 'prod-schneider-breaker-32a', quantity: 5 },
    ]);
    assert(reservations.length === 1, 'Stock reservation created successfully');
    assert(reservations[0].status === 'ACTIVE', 'Reservation status is ACTIVE');

    const released = InventoryService.cleanExpiredReservationsSync();
    assert(typeof released === 'number', 'Expired reservation cleaner executes safely');

    // Oversell prevention
    let oversellCaught = false;
    try {
      await InventoryService.reserveStockForOrder('test-ord-oversell', [
        { productId: 'prod-digital-multimeter-uni-t', quantity: 99999 },
      ]);
    } catch {
      oversellCaught = true;
    }
    assert(oversellCaught, 'Prevents inventory overselling with atomic check');
  }

  // -------------------------------------------------------------------
  let testOrder: any;
  let testGuestToken: string;
  // 4. ORDER CREATION, PHONE VALIDATION & GUEST ACCESS
  // -------------------------------------------------------------------
  console.log('\n📝 4. Testing Order Creation & Egyptian Phone Validation:');
  {
    assert(OrderService.isValidEgyptianPhone('01012345678') === true, 'Validates 010 Egyptian mobile number');
    assert(OrderService.isValidEgyptianPhone('01198765432') === true, 'Validates 011 Egyptian mobile number');
    assert(OrderService.isValidEgyptianPhone('01234567890') === true, 'Validates 012 Egyptian mobile number');
    assert(OrderService.isValidEgyptianPhone('01511223344') === true, 'Validates 015 Egyptian mobile number');
    assert(OrderService.isValidEgyptianPhone('01312345678') === false, 'Rejects invalid Egyptian mobile prefix (013)');
    assert(OrderService.isValidEgyptianPhone('12345') === false, 'Rejects short number');

    const { order, guestAccessToken } = await OrderService.createOrder({
      customerName: 'م. حسام الدين عبد الرحمن',
      customerPhone: '01099887766',
      fulfillmentMethod: 'DELIVERY',
      zoneId: 'zone-cairo',
      subZoneId: 'sub-new-cairo',
      addressDetails: 'شارع التسعين الجنوبي، فيلا 12، القاهرة الجديدة',
      paymentMethod: 'CASH_ON_DELIVERY',
      items: [{ productId: 'prod-venus-led-panel-18w', quantity: 4 }],
    });
    testOrder = order;
    testGuestToken = guestAccessToken;

    assert(order.orderNumber.startsWith('MOT-2026-'), 'Generated valid formatted order number');
    assert(order.shippingFee === 50, 'Applied correct New Cairo shipping fee (50 EGP)');
    assert(order.finalTotal > 0, 'Final total calculated authoritatively');
    assert(guestAccessToken.length === 64, 'Generated high-entropy guest access token (32 bytes hex)');

    const verifiedOrder = OrderService.verifyGuestOrderAccess(order.id, guestAccessToken);
    assert(verifiedOrder !== null, 'Customer accesses order with valid token');

    const invalidAccess = OrderService.verifyGuestOrderAccess(order.id, 'wrong_token_12345');
    assert(invalidAccess === null, 'IDOR protection: Rejects invalid guest token');

    const transitioned = await OrderService.transitionOrderStatus(
      order.id,
      'PROCESSING',
      'تجهيز البضائع في المخزن',
      'TEST_RUNNER'
    );
    assert(transitioned.orderStatus === 'PROCESSING', 'Transitioned order status to PROCESSING');
  }

  // -------------------------------------------------------------------
  // 5. PAYMOB PAYMENT GATEWAY HMAC & SECURITY REGRESSION (PHASE 1)
  // -------------------------------------------------------------------
  console.log('\n💳 5. Testing Paymob HMAC-SHA512 & Payment Security (Phase 1):');
  {
    const secret = 'test_hmac_secret_motaheda_2026';
    const mockPayload: { obj: Record<string, any>; orderId: string } = {
      obj: {
        id: 98765432,
        amount_cents: Math.round(testOrder.finalTotal * 100),
        currency: 'EGP',
        created_at: '2026-10-29T12:00:00.000Z',
        error_occured: false,
        has_parent_transaction: false,
        integration_id: 12345,
        is_3d_secure: true,
        is_auth: false,
        is_capture: false,
        is_refunded: false,
        is_standalone_payment: true,
        is_voided: false,
        owner: 54321,
        pending: false,
        success: true,
        order: { id: 112233, merchant_order_id: testOrder.id },
        source_data: { pan: '2346', sub_type: 'MasterCard', type: 'card' },
      },
      orderId: testOrder.id,
    };

    const validHmac = PaymobService.calculatePaymobHmac(mockPayload, secret);
    assert(typeof validHmac === 'string' && validHmac.length === 128, 'Generated valid 512-bit HMAC hex string');

    // Regression Test 1: Missing HMAC signature must be rejected (Phase 1.1)
    let missingHmacCaught = false;
    try {
      await PaymobService.processWebhook(mockPayload, undefined);
    } catch (err: any) {
      missingHmacCaught = err.message.includes('Missing HMAC Signature');
    }
    assert(missingHmacCaught, 'Regression: Missing HMAC signature rejected with error');

    // Regression Test 2: Invalid HMAC signature must be rejected (Phase 1.1)
    let invalidHmacCaught = false;
    try {
      await PaymobService.processWebhook(mockPayload, 'invalid_hmac_signature_attempt');
    } catch (err: any) {
      invalidHmacCaught = err.message.includes('Invalid HMAC Signature');
    }
    assert(invalidHmacCaught, 'Regression: Tampered/Invalid HMAC signature rejected');

    // Regression Test 3: Currency mismatch must be rejected (Phase 1.3)
    let currencyMismatchCaught = false;
    const usdPayload = JSON.parse(JSON.stringify(mockPayload));
    usdPayload.obj.id = `tx-usd-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    usdPayload.obj.currency = 'USD';
    const usdHmac = PaymobService.calculatePaymobHmac(usdPayload, secret);
    try {
      await PaymobService.processWebhook(usdPayload, usdHmac);
    } catch (err: any) {
      currencyMismatchCaught = err.message.includes('EGP');
    }
    assert(currencyMismatchCaught, 'Regression: Currency mismatch (non-EGP) rejected');

    // Regression Test 4: Mismatched amount must be rejected without tolerance (Phase 1.3 & 1.4)
    let amountMismatchCaught = false;
    const tamperedPayload = JSON.parse(JSON.stringify(mockPayload));
    tamperedPayload.obj.id = `tx-tamper-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    tamperedPayload.obj.amount_cents = Math.round(testOrder.finalTotal * 100) - 500; // 5 EGP difference
    const tamperedHmac = PaymobService.calculatePaymobHmac(tamperedPayload, secret);
    try {
      await PaymobService.processWebhook(tamperedPayload, tamperedHmac);
    } catch (err: any) {
      amountMismatchCaught = err.message.includes('فشل التحقق المالي');
    }
    assert(amountMismatchCaught, 'Regression: Amount mismatch rejected without permissive tolerances');

    // Valid webhook processing with unique transaction ID
    mockPayload.obj.id = `tx-valid-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const freshValidHmac = PaymobService.calculatePaymobHmac(mockPayload, secret);
    const validResult = await PaymobService.processWebhook(mockPayload, freshValidHmac);
    assert(validResult.success === true, 'Valid signed webhook successfully confirms payment');

    // Idempotency: Second identical transaction ID must be deduplicated (Phase 1.6)
    const duplicateResult = await PaymobService.processWebhook(mockPayload, freshValidHmac);
    assert(duplicateResult.duplicate === true, 'Regression: Duplicate webhook detected and deduplicated safely');
  }

  // -------------------------------------------------------------------
  // 6. ADMIN AUTHENTICATION, OTP & EMERGENCY RECOVERY (PHASE 2)
  // -------------------------------------------------------------------
  console.log('\n🔑 6. Testing Admin 2FA Authentication & Account Throttling (Phase 2):');
  {
    // Valid password -> Initiates OTP challenge
    const loginInit = AuthService.initiateAdminLogin('admin', 'AdminMotaheda2026!');
    assert(loginInit.success === true, 'Admin password verified, OTP challenge initiated');
    assert(loginInit.challengeId !== undefined, 'Issued challenge ID');

    // In dev mode devOtp is present, in production devOtp is undefined
    const isDev = process.env.NODE_ENV !== 'production';
    assert(isDev ? loginInit.devOtp !== undefined : loginInit.devOtp === undefined, 'devOtp only exposed in development');

    // Invalid OTP attempt
    const badOtp = AuthService.verifyAdminOtp(loginInit.challengeId!, '000000');
    assert(badOtp.success === false, 'Rejects incorrect OTP');

    // Valid OTP verification
    const goodOtp = AuthService.verifyAdminOtp(loginInit.challengeId!, loginInit.devOtp || '000000');
    if (loginInit.devOtp) {
      assert(goodOtp.success === true, 'Admin verified OTP successfully');
      assert(goodOtp.session?.role === 'SUPER_ADMIN', 'Session created with SUPER_ADMIN role');

      // Replay attack prevention: OTP cannot be reused
      const replayedOtp = AuthService.verifyAdminOtp(loginInit.challengeId!, loginInit.devOtp);
      assert(replayedOtp.success === false, 'Prevents OTP replay attack (challenge invalidated)');

      // Persistent session verification
      const sessionInDb = AuthService.getSession(goodOtp.session!.sessionId);
      assert(sessionInDb !== null, 'Session persistently stored in database');

      // Session invalidation on logout
      AuthService.invalidateSession(goodOtp.session!.sessionId);
      const afterLogout = AuthService.getSession(goodOtp.session!.sessionId);
      assert(afterLogout === null, 'Session properly invalidated on logout');
    }

    // Emergency Recovery Code Single-Use Test (Phase 2.4)
    // Dynamically insert a fresh single-use recovery code for testing
    const testRecoveryCode = `MOTAHEDA-TEST-${Date.now()}`;
    const testRecoveryHash = crypto.createHash('sha256').update(testRecoveryCode).digest('hex');
    const { sqlite } = await import('../server/db/database.ts');
    sqlite.prepare(`
      INSERT INTO recovery_codes (id, username, code_hash, is_used, created_at)
      VALUES (?, ?, ?, 0, ?)
    `).run(`rec-test-${Date.now()}`, 'admin', testRecoveryHash, new Date().toISOString());

    const emergencyLogin1 = AuthService.verifyEmergencyRecoveryCode('admin', testRecoveryCode);
    assert(emergencyLogin1.success === true, 'Emergency recovery code grants administrative access on outage');

    // Second use of the same recovery code must be rejected (Single-use enforcement)
    const emergencyLogin2 = AuthService.verifyEmergencyRecoveryCode('admin', testRecoveryCode);
    assert(emergencyLogin2.success === false, 'Regression: Single-use recovery code CANNOT be reused a second time');
  }

  // -------------------------------------------------------------------
  // 7. PERSISTENT SQL DATABASE & CONCURRENCY VERIFICATION (PHASE 3)
  // -------------------------------------------------------------------
  console.log('\n💾 7. Testing Persistent Database & Concurrency Safety (Phase 3):');
  {
    // Test direct persistent database connection
    const dbPath = path.resolve(process.cwd(), 'data', 'almotaheda.db');
    const freshDb = new Database(dbPath, { readonly: true });

    const productRow = freshDb.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
    assert(productRow.count >= 7, 'Persistent SQLite database has all products stored on disk');

    const ordersRow = freshDb.prepare('SELECT COUNT(*) as count FROM orders').get() as { count: number };
    assert(ordersRow.count >= 1, 'Orders are persistently written to disk SQLite table');

    freshDb.close();

    // Concurrency test: Competing reservations on limited stock
    // Set a test product stock to 1
    const testItemId = 'prod-digital-multimeter-uni-t';
    db.updateProductStock(testItemId, 1);

    // Run two competing reservations for quantity 1 concurrently
    let successCount = 0;
    let failureCount = 0;

    await Promise.all([
      InventoryService.reserveStockForOrder('concurrent-ord-1', [{ productId: testItemId, quantity: 1 }])
        .then(() => successCount++)
        .catch(() => failureCount++),
      InventoryService.reserveStockForOrder('concurrent-ord-2', [{ productId: testItemId, quantity: 1 }])
        .then(() => successCount++)
        .catch(() => failureCount++),
    ]);

    assert(successCount === 1, 'Concurrency: Exactly one competing reservation succeeds for the final item');
    assert(failureCount === 1, 'Concurrency: Second competing reservation is rejected without overselling');

    // Clean up test reservation
    InventoryService.releaseOrderReservation('concurrent-ord-1', 'Clean up concurrency test');
    db.updateProductStock(testItemId, 3);
  }

  console.log('\n======================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
