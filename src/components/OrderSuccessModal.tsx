import {
  CheckCircle,
  Copy,
  ExternalLink,
  MessageCircle,
  Package,
  Phone,
  ShieldAlert,
  Truck,
  X,
  Zap,
} from 'lucide-react';
import React, { useState } from 'react';
import { Order } from '../types/index.ts';

interface OrderSuccessModalProps {
  order: Order | null;
  guestAccessToken: string;
  whatsappUrl: string;
  onClose: () => void;
  onOrderCancelled?: () => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  order,
  guestAccessToken,
  whatsappUrl,
  onClose,
  onOrderCancelled,
}) => {
  if (!order) return null;

  const [copied, setCopied] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState('');

  function handleCopyOrderNumber() {
    if (order) {
      navigator.clipboard.writeText(order.orderNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleCancelOrder() {
    if (!order) return;
    if (!confirm('هل أنت متأكد من رغبتك في إلغاء هذا الطلب وإعادة البضائع للمخزن؟')) return;

    setCancelling(true);
    try {
      const res = await fetch(`/api/orders/guest/${order.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-guest-token': guestAccessToken,
        },
        body: JSON.stringify({ reason: 'طلب العميل الإلغاء فور التسجيل' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCancelMessage('تم إلغاء الطلب بنجاح.');
      if (onOrderCancelled) onOrderCancelled();
    } catch (err: any) {
      setCancelMessage(err.message || 'تعذر إلغاء الطلب.');
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Header Ribbon */}
        <div className="bg-emerald-600 text-white p-6 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 left-4 w-8 h-8 rounded-full bg-emerald-700 hover:bg-emerald-800 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="w-16 h-16 rounded-2xl bg-white text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-950/20">
            <CheckCircle className="w-9 h-9 stroke-[2.5]" />
          </div>
          <h2 className="text-xl font-black">تم تسجيل وتأكيد طلبك بنجاح!</h2>
          <p className="text-emerald-100 text-xs mt-1">
            شكراً لثقتكم في شركة المتحدة للأدوات الكهربائية. تم حجز البضائع بالمخزن.
          </p>
        </div>

        {/* Order Details Body */}
        <div className="p-6 space-y-5">
          {/* Order Reference Number Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 font-bold block">رقم الطلب المرجعي:</span>
              <span className="text-lg font-black text-slate-900 font-mono tracking-wider">
                {order.orderNumber}
              </span>
            </div>
            <button
              onClick={handleCopyOrderNumber}
              className="flex items-center gap-1.5 bg-white border border-slate-300 hover:bg-slate-100 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 shadow-sm transition-all"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'تم النسخ!' : 'نسخ الرقم'}</span>
            </button>
          </div>

          {/* WhatsApp Click-to-Chat Mandatory Button (Section 13) */}
          <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 text-center space-y-2.5">
            <p className="text-xs font-bold text-emerald-950">
              ⚡ لتسريع تجهيز بضاعتك وشحنها، يرجى إرسال تفاصيل الطلب لمسؤول مبيعات المتجر عبر الواتساب:
            </p>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba59] active:scale-98 text-white font-black text-sm px-6 py-3 rounded-xl shadow-lg shadow-emerald-600/20 transition-all w-full"
            >
              <MessageCircle className="w-5 h-5 fill-white" />
              <span>تأكيد الطلب عبر واتساب المتجر</span>
            </a>
            <span className="text-[10px] text-emerald-700 font-medium block">
              يفتح محادثة واتساب الرسمية مع رسالة جاهزة تتضمن رقم الطلب والاسم والإجمالي
            </span>
          </div>

          {/* Summary Box */}
          <div className="border border-slate-200 rounded-2xl p-4 space-y-3 text-xs">
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500">اسم العميل:</span>
              <span className="font-bold text-slate-900">{order.customerName}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500">رقم الهاتف:</span>
              <span className="font-bold text-slate-900 font-mono">{order.customerPhone}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500">طريقة الاستلام:</span>
              <span className="font-bold text-slate-900">
                {order.fulfillmentMethod === 'PICKUP'
                  ? `استلام من فرع: ${order.branchName || 'الفرع المعتمد'}`
                  : `توصيل للموقع (${order.governorate} - ${order.district || ''})`}
              </span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-500">حالة الدفع:</span>
              <span
                className={`font-black px-2 py-0.5 rounded text-[11px] ${
                  order.paymentStatus === 'PAID'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {order.paymentStatus === 'PAID' ? 'تم السداد بنجاح' : 'في انتظار التحصيل'}
              </span>
            </div>
            <div className="flex justify-between pt-1 text-sm font-black text-slate-950">
              <span>الإجمالي المستحق:</span>
              <span className="text-amber-700 text-base">{order.finalTotal} ج.م</span>
            </div>
          </div>

          {/* Cancellation section if eligible */}
          {order.orderStatus === 'PENDING' && order.paymentStatus !== 'PAID' && !cancelMessage && (
            <div className="text-center pt-2">
              <button
                onClick={handleCancelOrder}
                disabled={cancelling}
                className="text-xs text-red-600 hover:text-red-700 underline font-semibold"
              >
                {cancelling ? 'جاري الإلغاء...' : 'إلغاء الطلب وتحرير المخزون'}
              </button>
            </div>
          )}

          {cancelMessage && (
            <div className="bg-slate-100 text-slate-700 text-xs p-3 rounded-xl text-center font-bold">
              {cancelMessage}
            </div>
          )}

          {/* Done CTA */}
          <button
            onClick={onClose}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs transition-colors"
          >
            العودة لصفحة المتجر الرئيسية
          </button>
        </div>
      </div>
    </div>
  );
};
