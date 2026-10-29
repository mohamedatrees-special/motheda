import {
  AlertCircle,
  Building,
  CheckCircle2,
  CreditCard,
  Lock,
  ShieldCheck,
  Smartphone,
  X,
  Zap,
} from 'lucide-react';
import React, { useState } from 'react';
import { Order } from '../types/index.ts';

interface PaymobSandboxModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onPaymentCompleted: (updatedOrder: Order) => void;
}

export const PaymobSandboxModal: React.FC<PaymobSandboxModalProps> = ({
  order,
  isOpen,
  onClose,
  onPaymentCompleted,
}) => {
  if (!isOpen || !order) return null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<'Card' | 'Wallet' | 'ValU'>('Card');

  async function handleSimulate(success: boolean) {
    if (!order) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/checkout/paymob-sandbox/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          success,
          paymentMethod: selectedMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Re-fetch order status to reflect authoritative backend state
      const orderRes = await fetch(`/api/orders/guest/${order.id}`);
      const orderData = await orderRes.json();

      onPaymentCompleted(orderData.order || order);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ في محاكاة الدفع.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Paymob Brand Ribbon */}
        <div className="bg-[#1C2C5B] text-white p-5 flex items-center justify-between border-b border-blue-900">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <div className="text-sm font-black flex items-center gap-1.5">
                <span>بوابة الدفع الإلكتروني — بايموب Paymob</span>
                <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-400/30 px-1.5 py-0.5 rounded font-mono">
                  Sandbox Test
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-sans">
                طلب #{order.orderNumber} • شركة المتحدة للأدوات الكهربائية
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-800 text-xs p-3 rounded-xl border border-red-300 font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Amount Due Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-bold">المبلغ الإجمالي للدفع:</span>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {order.finalTotal} <span className="text-sm font-sans">ج.م</span>
              </div>
            </div>
            <div className="text-left text-xs text-slate-500">
              <div>العملة: EGP (الجنيه المصري)</div>
              <div className="font-semibold text-emerald-800 flex items-center gap-1 mt-0.5">
                <Lock className="w-3 h-3" />
                تشفير 256-bit آمن
              </div>
            </div>
          </div>

          {/* Payment Method Selector in Gateway */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              اختر وسيلة الدفع من خلال بايموب:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedMethod('Card')}
                className={`p-3 rounded-xl border text-center text-xs transition-all ${
                  selectedMethod === 'Card'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 font-black shadow-sm'
                    : 'border-slate-200 text-slate-700'
                }`}
              >
                <CreditCard className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                <span>بطاقة بنكية</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod('Wallet')}
                className={`p-3 rounded-xl border text-center text-xs transition-all ${
                  selectedMethod === 'Wallet'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 font-black shadow-sm'
                    : 'border-slate-200 text-slate-700'
                }`}
              >
                <Smartphone className="w-4 h-4 mx-auto mb-1 text-red-600" />
                <span>محفظة ذكية</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod('ValU')}
                className={`p-3 rounded-xl border text-center text-xs transition-all ${
                  selectedMethod === 'ValU'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 font-black shadow-sm'
                    : 'border-slate-200 text-slate-700'
                }`}
              >
                <Zap className="w-4 h-4 mx-auto mb-1 text-amber-600" />
                <span>تقسيط فاليو</span>
              </button>
            </div>
          </div>

          {/* Sandbox Info Notice */}
          <div className="bg-sky-50 border border-sky-200 text-sky-900 text-xs p-3.5 rounded-2xl space-y-1 font-medium">
            <div className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-sky-600" />
              بيئة تجريبية معتمدة لاختبار بايموب (Sandbox Testing Environment):
            </div>
            <p className="text-[11px] text-sky-800 leading-relaxed">
              هذه البيئة تحاكي السلوك الفعلي لبوابة Paymob وإرسال إشعار الـ Webhook مع التحقق من توقيع HMAC-SHA512 وتثبيت المخزون دون خصم أموال حقيقية.
            </p>
          </div>

          {/* Action Simulation Buttons */}
          <div className="space-y-2 pt-2">
            <button
              onClick={() => handleSimulate(true)}
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'جاري التحقق من التوقيع المالي...' : 'محاكاة نجاح الدفع (Simulate Payment Success)'}</span>
            </button>

            <button
              onClick={() => handleSimulate(false)}
              disabled={loading}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-colors"
            >
              محاكاة فشل العملية (Simulate Failure / Cancel)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
