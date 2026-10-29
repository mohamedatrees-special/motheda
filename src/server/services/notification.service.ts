import { Order } from '../../types/index.ts';

export interface NotificationLogItem {
  id: string;
  orderId: string;
  channel: 'WHATSAPP_MANUAL' | 'WHATSAPP_AUTOMATED' | 'EMAIL';
  recipient: string;
  payload: string;
  status: 'SENT' | 'PENDING' | 'DISABLED';
  timestamp: string;
}

export class NotificationService {
  public static notificationLogs: NotificationLogItem[] = [];

  /**
   * Generates sanitized WhatsApp Click-to-Chat URL
   * Template: مرحباً متجر المتحدة، قمت بعمل طلب جديد رقم #{{order_id}} بقيمة {{total_amount}} ج.م باسم {{customer_name}}. برجاء تأكيد الطلب.
   */
  public static generateWhatsAppClickToChatUrl(order: Order): string {
    const rawPhone = process.env.STORE_WHATSAPP_NUMBER || '201012345678';
    const storePhone = rawPhone.replace(/\D/g, '');

    const message =
      `مرحباً متجر المتحدة، قمت بعمل طلب جديد رقم #${order.orderNumber} ` +
      `بقيمة ${order.finalTotal} ج.م باسم ${order.customerName}. برجاء تأكيد الطلب.`;

    const encodedText = encodeURIComponent(message);
    const url = `https://wa.me/${storePhone}?text=${encodedText}`;

    this.notificationLogs.push({
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      orderId: order.id,
      channel: 'WHATSAPP_MANUAL',
      recipient: storePhone,
      payload: message,
      status: 'SENT',
      timestamp: new Date().toISOString(),
    });

    return url;
  }

  /**
   * Dispatches automated order event (Email or WhatsApp API if configured)
   */
  public static async dispatchOrderCreatedNotification(order: Order): Promise<void> {
    const isWhatsAppEnabled = process.env.ENABLE_WHATSAPP_NOTIFICATIONS === 'true';

    this.notificationLogs.push({
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      orderId: order.id,
      channel: isWhatsAppEnabled ? 'WHATSAPP_AUTOMATED' : 'EMAIL',
      recipient: order.customerPhone,
      payload: `تأكيد تسجيل طلب كهرباء #${order.orderNumber} بقيمة ${order.finalTotal} ج.م`,
      status: isWhatsAppEnabled ? 'SENT' : 'DISABLED',
      timestamp: new Date().toISOString(),
    });
  }
}
