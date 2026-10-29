import crypto from 'crypto';
import { PaymentAttempt } from '../../types/index.ts';
import { db } from '../db/store.ts';
import { InventoryService } from './inventory.service.ts';

export interface PaymobIntentResponse {
  paymentAttemptId: string;
  orderId: string;
  amountCents: number;
  currency: string;
  paymentUrl: string;
  iframeUrl?: string;
  isSandbox: boolean;
}

export class PaymobService {
  private static getHmacSecret(): string {
    const secret = process.env.PAYMOB_HMAC_SECRET;
    if (!secret || secret === 'placeholder_paymob_hmac_secret') {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('SECURITY HALT: PAYMOB_HMAC_SECRET is missing or set to placeholder in production.');
      }
      return 'test_hmac_secret_motaheda_2026';
    }
    return secret;
  }

  /**
   * Generates Payment Intent for an order
   */
  public static async createPaymentIntent(orderId: string): Promise<PaymobIntentResponse> {
    const order = db.orders.get(orderId);
    if (!order) {
      throw new Error(`الطلب برقم ${orderId} غير موجود.`);
    }

    if (order.paymentStatus === 'PAID') {
      throw new Error('هذا الطلب تم سداده مسبقاً بنجاح.');
    }

    const amountCents = Math.round(order.finalTotal * 100);
    const paymentAttemptId = `pay-att-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const mockProviderOrderId = `pm-ord-${Math.floor(100000 + Math.random() * 900000)}`;

    const attempt: PaymentAttempt = {
      id: paymentAttemptId,
      orderId,
      provider: 'PAYMOB',
      providerOrderId: mockProviderOrderId,
      amount: order.finalTotal,
      currency: 'EGP',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.paymentAttempts.set(paymentAttemptId, attempt);
    order.paymentStatus = 'PENDING';
    db.orders.set(order.id, order);

    const paymentUrl = `/checkout/paymob-sandbox?attemptId=${paymentAttemptId}&orderId=${orderId}&amount=${order.finalTotal}&orderNumber=${order.orderNumber}`;

    return {
      paymentAttemptId,
      orderId,
      amountCents,
      currency: 'EGP',
      paymentUrl,
      isSandbox: !process.env.PAYMOB_API_KEY || process.env.PAYMOB_API_KEY.includes('placeholder'),
    };
  }

  /**
   * Official Paymob HMAC-SHA512 calculation
   * Concatenates official fields in exact documented order
   */
  public static calculatePaymobHmac(payload: Record<string, any>, hmacSecret: string): string {
    const obj = payload.obj || payload;
    const orderObj = obj.order || {};
    const sourceData = obj.source_data || {};

    // Exact Paymob documented field sequence (20 fields)
    const values = [
      obj.amount_cents ?? '',
      obj.created_at ?? '',
      obj.currency ?? '',
      obj.error_occured ?? '',
      obj.has_parent_transaction ?? '',
      obj.id ?? '',
      obj.integration_id ?? '',
      obj.is_3d_secure ?? '',
      obj.is_auth ?? '',
      obj.is_capture ?? '',
      obj.is_refunded ?? '',
      obj.is_standalone_payment ?? '',
      obj.is_voided ?? '',
      orderObj.id ?? '',
      obj.owner ?? '',
      obj.pending ?? '',
      sourceData.pan ?? '',
      sourceData.sub_type ?? '',
      sourceData.type ?? '',
      obj.success ?? '',
    ];

    const concatenated = values.join('');
    return crypto.createHmac('sha512', hmacSecret).update(concatenated).digest('hex');
  }

  /**
   * Verifies Webhook signature safely in constant-time
   */
  public static verifyWebhookSignature(payload: Record<string, any>, receivedHmac: string): boolean {
    if (!receivedHmac || typeof receivedHmac !== 'string') return false;
    const computedHmac = this.calculatePaymobHmac(payload, this.getHmacSecret());
    if (computedHmac.length !== receivedHmac.length) return false;
    try {
      return crypto.timingSafeEqual(Buffer.from(computedHmac), Buffer.from(receivedHmac));
    } catch {
      return false;
    }
  }

  /**
   * Idempotent Webhook Processing with strict financial and signature verification
   */
  public static async processWebhook(
    payload: Record<string, any>,
    receivedHmac?: string
  ): Promise<{ success: boolean; duplicate?: boolean; message: string }> {
    // 1. Mandatory HMAC signature verification (Phase 1.1)
    if (!receivedHmac || receivedHmac.trim() === '') {
      throw new Error('توقيع إشعار بايموب مفقود (Missing HMAC Signature). تم رفض الطلب لحماية المدفوعات.');
    }

    if (!this.verifyWebhookSignature(payload, receivedHmac.trim())) {
      throw new Error('توقيع إشعار بايموب غير صالح (Invalid HMAC Signature). تم رفض الطلب لحماية المدفوعات.');
    }

    const obj = payload.obj || payload;
    const transactionId = String(obj.id || '').trim();
    const orderRef = String(obj.order?.merchant_order_id || obj.merchant_order_id || payload.orderId || '').trim();

    // 2. Validate transaction ID (Phase 1.3)
    if (!transactionId || transactionId === 'undefined') {
      throw new Error('معرف المعاملة (transaction id) مفقود في إشعار بايموب.');
    }

    // 3. Idempotency Check: Prevent duplicate transactions & duplicate fulfillment (Phase 1.6)
    if (db.processedWebhookEvents.has(transactionId)) {
      return {
        success: true,
        duplicate: true,
        message: 'تمت معالجة هذه المعاملة مسبقاً (إشعار مكرر تم تجاهله بأمان دون تكرار الخصم).',
      };
    }

    // 4. Resolve Order
    const order = db.orders.get(orderRef);
    if (!order) {
      throw new Error(`الطلب المرتبط بمعاملة بايموب (${orderRef}) غير موجود بقاعدة البيانات.`);
    }

    // 5. Strict Currency Verification (Phase 1.3)
    const currency = String(obj.currency || '').toUpperCase();
    if (currency !== 'EGP') {
      throw new Error(`عملة غير مطابقة في المعاملة: "${currency}" (العملة المعتمدة هي EGP فقط).`);
    }

    // 6. Strict Exact Amount Verification (Phase 1.3 & 1.4: No permissive tolerances)
    const reportedAmountCents = Number(obj.amount_cents);
    if (isNaN(reportedAmountCents) || reportedAmountCents <= 0) {
      throw new Error('قيمة المبلغ المسدد غير صالحة أو مفقودة في إشعار بايموب.');
    }

    const expectedAmountCents = Math.round(order.finalTotal * 100);
    if (reportedAmountCents !== expectedAmountCents) {
      throw new Error(
        `فشل التحقق المالي: المبلغ المسدد (${reportedAmountCents / 100} ج.م) لا يطابق إجمالي الطلب (${order.finalTotal} ج.م) بدقة تامة.`
      );
    }

    // 7. Check Authoritative Success State (Phase 1.3)
    const isSuccess = obj.success === true || obj.success === 'true';

    // Mask PAN for secure audit (Phase 1.8)
    const rawPan = obj.source_data?.pan || '';
    const maskedPan = rawPan.length >= 4 ? `**** **** **** ${rawPan.slice(-4)}` : '****';

    return db.transaction(() => {
      // Record transaction in persistent table for idempotency
      db.processedWebhookEvents.add(
        transactionId,
        order.id,
        reportedAmountCents,
        currency,
        isSuccess,
        JSON.stringify({
          maskedPan,
          subType: obj.source_data?.sub_type || 'Unknown',
          type: obj.source_data?.type || 'Online',
        })
      );

      if (isSuccess) {
        order.paymentStatus = 'PAID';
        order.orderStatus = 'CONFIRMED';
        order.updatedAt = new Date().toISOString();
        db.orders.set(order.id, order);

        // Commit stock deductions atomically
        InventoryService.commitOrderStock(order.id);

        db.addAuditLog({
          id: `audit-pm-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actor: 'PAYMOB_WEBHOOK',
          role: 'PAYMENT_GATEWAY',
          action: 'PAYMENT_CONFIRMED',
          entity: 'ORDER',
          entityId: order.id,
          details: `تم تأكيد سداد الطلب رقم ${order.orderNumber} عبر بايموب (المعاملة: ${transactionId}, البطاقة: ${maskedPan}). تم تثبيت خصم المخزون بنجاح.`,
        });

        return {
          success: true,
          message: 'تم سداد وتأكيد الطلب وتحديث المخزون بنجاح.',
        };
      } else {
        order.paymentStatus = 'FAILED';
        order.updatedAt = new Date().toISOString();
        db.orders.set(order.id, order);

        db.addAuditLog({
          id: `audit-pm-fail-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actor: 'PAYMOB_WEBHOOK',
          role: 'PAYMENT_GATEWAY',
          action: 'PAYMENT_FAILED',
          entity: 'ORDER',
          entityId: order.id,
          details: `فشلت محاولة الدفع الإلكتروني للطلب رقم ${order.orderNumber} عبر بايموب (المعاملة: ${transactionId}). لم يتم تغيير رصيد المخزون.`,
        });

        return {
          success: false,
          message: 'تم تسجيل فشل محاولة الدفع في سجلات الطلب بأمان.',
        };
      }
    });
  }
}
