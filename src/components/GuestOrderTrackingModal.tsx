import {
  AlertCircle,
  CheckCircle,
  Clock,
  MessageCircle,
  Package,
  Search,
  Truck,
  X,
  XCircle,
} from 'lucide-react';
import React, { useState } from 'react';
import { Order, OrderStatus } from '../types/index.ts';

interface GuestOrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuestOrderTrackingModal: React.FC<GuestOrderTrackingModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const [orderId, setOrderId] = useState('');
  const [guestToken, setGuestToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [error, setError] = useState('');
  const [cancelMessage, setCancelMessage] = useState('');

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!orderId.trim()) {
      setError('يرجى إدخال معرف أو رقم الطلب.');
      return;
    }

    setLoading(true);
    setError('');
    setOrder(null);
    setCancelMessage('');

    try {
      // Find order by public order number or orderId
      const cleanId = orderId.trim();
      const url = `/api/orders/guest/${cleanId}?token=${encodeURIComponent(guestToken.trim())}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'تعذر العثور على الطلب. يرجى التأكد من الرمز.');
      }

      setOrder(data.order);
      setWhatsappUrl(data.whatsappUrl);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء البحث عن الطلب.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!order) return;
    if (!confirm('هل أنت متأكد من رغبتك في إلغاء الطلب؟')) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/orders/guest/${order.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-guest-token': guestToken.trim(),
        },
        body: JSON.stringify({ reason: 'إلغاء بواسطة العميل من نافذة التتبع' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setOrder(data.order);
      setCancelMessage('تم إلغاء الطلب بنجاح وإعادة البضائع للمخزن.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const statusMap: Record<OrderStatus, { labelAr: string; color: string; desc: string }> = {
    PENDING: { labelAr: 'قيد الانتظار', color: 'bg-amber-100 text-amber-800', desc: 'تم استلام الطلب وبانتظار المراجعة أو الدفع.' },
    CONFIRMED: { labelAr: 'مؤكد', color: 'bg-blue-100 text-blue-800', desc: 'تم تأكيد الطلب وحجز المخزون رسميًا.' },
    PROCESSING: { labelAr: 'جاري التجهيز', color: 'bg-purple-100 text-purple-800', desc: 'فريق المخزن يقوم بتجميع وتغليف المهمات الكهربائية.' },
    SHIPPED: { labelAr: 'تم الشحن', color: 'bg-indigo-100 text-indigo-800', desc: 'الشحنة مع مندوب التوصيل في طريقها للموقع.' },
    DELIVERED: { labelAr: 'تم التسليم', color: 'bg-emerald-100 text-emerald-800', desc: 'تم تسليم البضاعة للموقع بنجاح.' },
    CANCELLED: { labelAr: 'ملغي', color: 'bg-red-100 text-red-800', desc: 'تم إلغاء الطلب وتحرير المخزون.' },
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-400" />
            <h3 className="font-extrabold text-base">تتبع حالة طلبك — متجر المتحدة</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Lookup Form */}
          <form onSubmit={handleSearch} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                معرف الطلب (Order ID): *
              </label>
              <input
                type="text"
                placeholder="مثال: ord-17408... (أو اضغط تتبع من رسالة التأكيد)"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                رمز الوصول السري (Guest Access Token) - اختياري إذا كان مخزناً بكوكيز المتصفح:
              </label>
              <input
                type="text"
                placeholder="رمز الأمان الممنوح لك عند الطلب"
                value={guestToken}
                onChange={(e) => setGuestToken(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <Search className="w-4 h-4" />
              <span>{loading ? 'جاري البحث في قاعدة البيانات...' : 'استعلام عن حالة الطلب'}</span>
            </button>
          </form>

          {error && (
            <div className="bg-red-50 text-red-800 text-xs p-3 rounded-xl border border-red-300 font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {cancelMessage && (
            <div className="bg-emerald-50 text-emerald-800 text-xs p-3 rounded-xl border border-emerald-300 font-bold text-center">
              {cancelMessage}
            </div>
          )}

          {/* Order Details View */}
          {order && (
            <div className="space-y-4 pt-3 border-t border-slate-200 text-xs">
              {/* Order Status Badge */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 font-bold block">طلب رقم:</span>
                  <span className="text-base font-black text-slate-900 font-mono">
                    {order.orderNumber}
                  </span>
                </div>
                <div className="text-left">
                  <span
                    className={`font-black px-3 py-1 rounded-full text-xs ${
                      statusMap[order.orderStatus]?.color || 'bg-slate-200'
                    }`}
                  >
                    {statusMap[order.orderStatus]?.labelAr || order.orderStatus}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-600 bg-amber-50 p-2.5 rounded-xl border border-amber-200 font-medium">
                {statusMap[order.orderStatus]?.desc}
              </p>

              {/* Items List */}
              <div className="border border-slate-200 rounded-2xl p-3.5 space-y-2">
                <span className="font-bold text-slate-800 block mb-1">مهمات الطلب:</span>
                {order.items.map((i) => (
                  <div key={i.id} className="flex justify-between py-1 border-b border-slate-100 last:border-0">
                    <span className="text-slate-700">
                      {i.titleAr} × {i.quantity}
                    </span>
                    <span className="font-bold text-slate-900">{i.lineTotal} ج.م</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 text-sm font-black text-slate-950">
                  <span>الإجمالي المسدد / المستحق:</span>
                  <span className="text-amber-700">{order.finalTotal} ج.م</span>
                </div>
              </div>

              {/* WhatsApp Click-to-Chat Button */}
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white font-bold py-2.5 rounded-xl text-xs transition-colors"
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  <span>تواصل مع مسؤول الطلبات عبر واتساب</span>
                </a>
              )}

              {/* Cancellation */}
              {order.orderStatus === 'PENDING' && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="w-full text-red-600 hover:text-red-700 text-xs font-bold py-1 text-center"
                >
                  إلغاء هذا الطلب
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
