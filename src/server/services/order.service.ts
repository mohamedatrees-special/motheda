import crypto from 'crypto';
import {
  FulfillmentMethod,
  Order,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../../types/index.ts';
import { db } from '../db/store.ts';
import { InventoryService } from './inventory.service.ts';
import { PricingService } from './pricing.service.ts';
import { ShippingService } from './shipping.service.ts';

export interface CreateOrderParams {
  customerName: string;
  customerPhone: string;
  email?: string;
  fulfillmentMethod: FulfillmentMethod;
  zoneId?: string;
  subZoneId?: string;
  branchId?: string;
  addressDetails?: string;
  deliveryInstructions?: string;
  paymentMethod: PaymentMethod;
  items: { productId: string; variantId?: string; quantity: number }[];
  clientIp?: string;
}

export class OrderService {
  /**
   * Validates Egyptian Mobile Numbers (e.g. 01012345678, 011..., 012..., 015...)
   */
  public static isValidEgyptianPhone(phone: string): boolean {
    const cleaned = phone.replace(/\s+/g, '').replace(/^\+20/, '0');
    return /^01[0125][0-9]{8}$/.test(cleaned);
  }

  /**
   * Enforces guest rate limit: max 3 orders per hour per IP/identifier to protect against abuse
   */
  public static checkGuestRateLimit(identifier: string): { allowed: boolean; retryAfterMinutes?: number } {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const record = db.guestRateLimits.get(identifier);

    if (!record) {
      db.guestRateLimits.set(identifier, { count: 1, firstAttemptAt: now });
      return { allowed: true };
    }

    if (now - record.firstAttemptAt > oneHour) {
      db.guestRateLimits.set(identifier, { count: 1, firstAttemptAt: now });
      return { allowed: true };
    }

    if (record.count >= 3) {
      const remainingMs = oneHour - (now - record.firstAttemptAt);
      const retryAfterMinutes = Math.ceil(remainingMs / (60 * 1000));
      return { allowed: false, retryAfterMinutes };
    }

    record.count++;
    return { allowed: true };
  }

  /**
   * Creates an order with complete server-side authoritative pricing,
   * shipping calculation, stock reservation, and cryptographically secure guest token.
   */
  public static async createOrder(
    params: CreateOrderParams
  ): Promise<{ order: Order; guestAccessToken: string }> {
    // 1. Validate customer details
    if (!params.customerName || params.customerName.trim().length < 3) {
      throw new Error('يرجى إدخال اسم العميل ثلاثياً على الأقل.');
    }

    if (!this.isValidEgyptianPhone(params.customerPhone)) {
      throw new Error('يرجى إدخال رقم هاتف محمول مصري صحيح (يبدأ بـ 010 أو 011 أو 012 أو 015 ويتكون من 11 رقماً).');
    }

    if (!params.items || params.items.length === 0) {
      throw new Error('سلة المشتريات فارغة.');
    }

    // 2. Guest Rate Limiting
    const rateLimitKey = params.clientIp || params.customerPhone;
    const rateCheck = this.checkGuestRateLimit(rateLimitKey);
    if (!rateCheck.allowed) {
      throw new Error(
        `لقد تجاوزت الحد المسموح من الطلبات خلال هذه الساعة. يرجى المحاولة بعد ${rateCheck.retryAfterMinutes} دقيقة.`
      );
    }

    // 3. Server-authoritative Pricing Calculation
    const pricing = PricingService.calculateOrderItems(params.items);

    // 4. Server-authoritative Shipping Calculation
    const shippingQuote = ShippingService.calculateShipping({
      fulfillmentMethod: params.fulfillmentMethod,
      zoneId: params.zoneId,
      subZoneId: params.subZoneId,
      branchId: params.branchId,
    });

    if (!shippingQuote.isAvailable) {
      throw new Error(shippingQuote.messageAr || 'التوصيل غير متاح لهذه المنطقة حالياً.');
    }

    const shippingFee = shippingQuote.shippingFee;
    const finalTotal = pricing.subtotal - pricing.discountTotal + shippingFee;

    // 5. Generate secure identifiers & guest access token
    const orderId = `ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `MOT-2026-${randomSuffix}`;

    // Cryptographic Guest Access Token
    const guestAccessToken = crypto.randomBytes(32).toString('hex');
    const guestAccessTokenHash = crypto
      .createHash('sha256')
      .update(guestAccessToken)
      .digest('hex');

    // 6. Concurrency-safe Stock Reservation
    await InventoryService.reserveStockForOrder(orderId, params.items);

    // If COD, order status is CONFIRMED immediately; if PAYMOB, UNPAID/PENDING until payment gateway callback
    const initialOrderStatus: OrderStatus =
      params.paymentMethod === 'CASH_ON_DELIVERY' ? 'CONFIRMED' : 'PENDING';
    const initialPaymentStatus: PaymentStatus = 'UNPAID';

    const order: Order = {
      id: orderId,
      orderNumber,
      customerName: params.customerName.trim(),
      customerPhone: params.customerPhone.trim(),
      email: params.email?.trim(),
      fulfillmentMethod: params.fulfillmentMethod,
      governorate: shippingQuote.zoneNameAr,
      district: shippingQuote.districtNameAr,
      addressDetails: params.addressDetails?.trim(),
      deliveryInstructions: params.deliveryInstructions?.trim(),
      branchId: shippingQuote.branch?.id,
      branchName: shippingQuote.branch?.nameAr,
      items: pricing.finalItems,
      subtotal: pricing.subtotal,
      discountTotal: pricing.discountTotal,
      shippingFee,
      finalTotal,
      currency: 'EGP',
      orderStatus: initialOrderStatus,
      paymentStatus: initialPaymentStatus,
      paymentMethod: params.paymentMethod,
      guestAccessTokenHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: [],
    };

    // If Cash on delivery, commit stock directly
    if (params.paymentMethod === 'CASH_ON_DELIVERY') {
      InventoryService.commitOrderStock(orderId);
    }

    db.orders.set(orderId, order);

    return { order, guestAccessToken };
  }

  /**
   * Resolves guest order access verifying raw token against persistent SHA256 hash
   */
  public static verifyGuestOrderAccess(orderId: string, rawToken: string): Order | null {
    const order = db.orders.get(orderId);
    if (!order) return null;

    const computedHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    if (computedHash !== order.guestAccessTokenHash) {
      return null;
    }

    return order;
  }

  /**
   * Strict Order State Machine Transitions
   */
  public static async transitionOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    reason: string,
    actor: string
  ): Promise<Order> {
    const order = db.orders.get(orderId);
    if (!order) {
      throw new Error(`الطلب برقم ${orderId} غير موجود.`);
    }

    const current = order.orderStatus;
    const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['PROCESSING', 'CANCELLED'],
      PROCESSING: ['SHIPPED', 'CANCELLED'],
      SHIPPED: ['DELIVERED', 'CANCELLED'],
      DELIVERED: [],
      CANCELLED: [],
    };

    if (!allowedTransitions[current].includes(newStatus)) {
      throw new Error(
        `لا يمكن تحويل حالة الطلب من "${current}" إلى "${newStatus}". انتقال غير مصرح به.`
      );
    }

    order.orderStatus = newStatus;
    order.updatedAt = new Date().toISOString();

    if (newStatus === 'CANCELLED') {
      order.cancellationReason = reason;
      // Release inventory if not yet fulfilled
      InventoryService.releaseOrderReservation(orderId, reason);
    }

    db.orders.set(order.id, order);

    db.addAuditLog({
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor,
      role: 'SYSTEM_OR_ADMIN',
      action: 'UPDATE_ORDER_STATUS',
      entity: 'ORDER',
      entityId: orderId,
      details: `تم تغيير حالة الطلب من ${current} إلى ${newStatus}. السبب: ${reason}`,
    });

    return order;
  }
}
