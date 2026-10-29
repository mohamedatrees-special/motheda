import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  CreditCard,
  MapPin,
  Minus,
  Phone,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Truck,
  User,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import {
  Branch,
  DeliveryZone,
  FulfillmentMethod,
  Order,
  PaymentMethod,
  Product,
} from '../types/index.ts';

export interface CartItem {
  product: Product;
  variantId?: string;
  variantNameAr?: string;
  quantity: number;
  unitPrice: number;
  unitDiscount: number;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, variantId: string | undefined, delta: number) => void;
  onRemoveItem: (productId: string, variantId: string | undefined) => void;
  onClearCart: () => void;
  onOrderCreated: (order: Order, guestAccessToken: string, whatsappUrl: string) => void;
  onOpenPaymobSandbox: (order: Order) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onOrderCreated,
  onOpenPaymobSandbox,
}) => {
  if (!isOpen) return null;

  // Checkout Form State
  const [step, setStep] = useState<'CART' | 'CHECKOUT'>('CART');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [fulfillmentMethod, setFulfillmentMethod] = useState<FulfillmentMethod>('DELIVERY');

  // Shipping Matrix State
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [selectedSubZoneId, setSelectedSubZoneId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [addressDetails, setAddressDetails] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH_ON_DELIVERY');

  // Shipping Quote
  const [shippingFee, setShippingFee] = useState<number>(0);
  const [shippingMessage, setShippingMessage] = useState<string>('');
  const [isShippingAvailable, setIsShippingAvailable] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch Zones & Branches on mount
  useEffect(() => {
    fetch('/api/shipping/zones')
      .then((r) => r.json())
      .then((data) => {
        if (data.zones) {
          setZones(data.zones);
          if (data.zones.length > 0) {
            setSelectedZoneId(data.zones[0].id);
          }
        }
      })
      .catch((err) => console.error(err));

    fetch('/api/shipping/branches')
      .then((r) => r.json())
      .then((data) => {
        if (data.branches) {
          setBranches(data.branches);
          if (data.branches.length > 0) {
            setSelectedBranchId(data.branches[0].id);
          }
        }
      })
      .catch((err) => console.error(err));
  }, []);

  // Recalculate Shipping Quote whenever selection changes
  useEffect(() => {
    if (fulfillmentMethod === 'PICKUP') {
      const branch = branches.find((b) => b.id === selectedBranchId);
      if (branch) {
        setShippingFee(0);
        setIsShippingAvailable(true);
        setShippingMessage(`استلام مجاني من ${branch.nameAr}`);
      } else {
        setShippingFee(0);
        setIsShippingAvailable(false);
        setShippingMessage('يرجى اختيار فرع الاستلام');
      }
      return;
    }

    if (!selectedZoneId) {
      setShippingFee(0);
      setIsShippingAvailable(false);
      setShippingMessage('يرجى اختيار المحافظة');
      return;
    }

    fetch('/api/shipping/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fulfillmentMethod: 'DELIVERY',
        zoneId: selectedZoneId,
        subZoneId: selectedSubZoneId || undefined,
      }),
    })
      .then((r) => r.json())
      .then((quote) => {
        setShippingFee(quote.shippingFee || 0);
        setIsShippingAvailable(quote.isAvailable);
        setShippingMessage(quote.messageAr || '');
      })
      .catch(() => {
        setIsShippingAvailable(false);
        setShippingMessage('تعذر احتساب تكلفة الشحن');
      });
  }, [fulfillmentMethod, selectedZoneId, selectedSubZoneId, selectedBranchId, branches]);

  // Selected Zone object for SubZone options
  const currentZone = zones.find((z) => z.id === selectedZoneId);

  // Financial Calculations
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const discountTotal = items.reduce(
    (sum, item) => sum + item.unitDiscount * item.quantity,
    0
  );
  const finalTotal = subtotal - discountTotal + (isShippingAvailable ? shippingFee : 0);

  // Live Phone Validation (Egyptian numbers)
  const isPhoneValid = /^01[0125][0-9]{8}$/.test(customerPhone.trim());

  // Handle Checkout Order Submission
  async function handleSubmitOrder() {
    setErrorMessage('');

    if (!customerName.trim() || customerName.trim().length < 3) {
      setErrorMessage('يرجى إدخال اسم العميل ثلاثياً على الأقل.');
      return;
    }

    if (!isPhoneValid) {
      setErrorMessage('يرجى إدخال رقم محمول مصري صحيح (11 رقماً يبدأ بـ 010 أو 011 أو 012 أو 015).');
      return;
    }

    if (fulfillmentMethod === 'DELIVERY') {
      if (!isShippingAvailable) {
        setErrorMessage(shippingMessage || 'التوصيل غير متاح لهذه المنطقة.');
        return;
      }
      if (!addressDetails.trim()) {
        setErrorMessage('يرجى كتابة العنوان التفصيلي لتسهيل التوصيل.');
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        fulfillmentMethod,
        zoneId: fulfillmentMethod === 'DELIVERY' ? selectedZoneId : undefined,
        subZoneId:
          fulfillmentMethod === 'DELIVERY' && selectedSubZoneId ? selectedSubZoneId : undefined,
        branchId: fulfillmentMethod === 'PICKUP' ? selectedBranchId : undefined,
        addressDetails: fulfillmentMethod === 'DELIVERY' ? addressDetails : undefined,
        deliveryInstructions: deliveryInstructions || undefined,
        paymentMethod,
        items: items.map((i) => ({
          productId: i.product.id,
          variantId: i.variantId,
          quantity: i.quantity,
        })),
      };

      const res = await fetch('/api/checkout/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل تسجيل الطلب.');
      }

      onClearCart();
      onClose();

      // If user selected Paymob online payment, open sandbox modal for instant simulation
      if (paymentMethod !== 'CASH_ON_DELIVERY') {
        onOpenPaymobSandbox(data.order);
      } else {
        onOrderCreated(data.order, data.guestAccessToken, data.whatsappUrl);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء معالجة الطلب.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-sm flex justify-start">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">
                {step === 'CART' ? 'سلة المشتريات الكهربائية' : 'إتمام الطلب وتأكيد الشحن'}
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                {items.length} أصناف مختارة للتوريد
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {items.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-slate-800 text-base">سلة المشتريات فارغة</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                تصفح قائمة الكابلات، القواطع ولوازم التأسيس واختر الأصناف التي تحتاجها لمشروعك.
              </p>
              <button
                onClick={onClose}
                className="mt-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl transition-all"
              >
                تصفح المنتجات الآن
              </button>
            </div>
          ) : step === 'CART' ? (
            /* STEP 1: CART ITEMS LIST */
            <div className="space-y-4">
              <div className="divide-y divide-slate-100">
                {items.map((item) => {
                  const itemTotal = (item.unitPrice - item.unitDiscount) * item.quantity;
                  return (
                    <div
                      key={`${item.product.id}-${item.variantId || 'base'}`}
                      className="py-3.5 flex items-center gap-3"
                    >
                      <img
                        src={
                          item.product.images[0] ||
                          'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80'
                        }
                        alt={item.product.titleAr}
                        className="w-16 h-16 rounded-xl object-cover bg-slate-100 border border-slate-200"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-mono text-slate-400">
                          {item.product.brand} • {item.product.sku}
                        </div>
                        <h4 className="font-bold text-xs text-slate-900 truncate">
                          {item.product.titleAr}
                        </h4>
                        {item.variantNameAr && (
                          <div className="text-[11px] text-amber-700 font-semibold">
                            المقاس: {item.variantNameAr}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-black text-sm text-slate-900">
                            {itemTotal} ج.م
                          </span>
                          {item.unitDiscount > 0 && (
                            <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.2 rounded font-bold">
                              خصم {item.unitDiscount * item.quantity} ج.م
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 border border-slate-200">
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, item.variantId, -1)}
                          className="w-6 h-6 rounded bg-white hover:bg-slate-200 flex items-center justify-center text-slate-700 text-xs font-bold"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-black text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, item.variantId, 1)}
                          className="w-6 h-6 rounded bg-white hover:bg-slate-200 flex items-center justify-center text-slate-700 text-xs font-bold"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => onRemoveItem(item.product.id, item.variantId)}
                        className="text-slate-400 hover:text-red-500 p-1 transition-colors"
                        title="حذف الصنف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Security notice */}
              <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3 text-xs text-amber-900 flex items-center gap-2 font-medium">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                <span>حجز البضائع فوري ومؤكد لحين إتمام السداد أو تأكيد الاستلام من الفرع.</span>
              </div>
            </div>
          ) : (
            /* STEP 2: CHECKOUT & SHIPPING MATRIX */
            <div className="space-y-5">
              {errorMessage && (
                <div className="bg-red-50 border border-red-300 text-red-800 text-xs p-3 rounded-xl flex items-center gap-2 font-bold animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Customer Contact */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5 border-b pb-1.5">
                  <User className="w-4 h-4 text-amber-500" />
                  بيانات العميل والفني المسؤول:
                </h4>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    الاسم ثلاثياً *
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: م. حسام الدين عبد الرحمن"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      رقم الهاتف المحمول (مصر) *
                    </label>
                    {customerPhone && (
                      <span
                        className={`text-[10px] font-bold ${
                          isPhoneValid ? 'text-emerald-700' : 'text-red-600'
                        }`}
                      >
                        {isPhoneValid ? '✓ رقم مصري صحيح' : 'يجب أن يبدأ بـ 010/011/012/015 ويتكون من 11 رقماً'}
                      </span>
                    )}
                  </div>
                  <input
                    type="tel"
                    placeholder="01012345678"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className={`w-full text-xs bg-slate-50 border rounded-xl px-3.5 py-2.5 font-mono focus:outline-none focus:bg-white ${
                      customerPhone && !isPhoneValid
                        ? 'border-red-400 focus:border-red-500'
                        : 'border-slate-300 focus:border-amber-500'
                    }`}
                  />
                </div>
              </div>

              {/* Fulfillment Method Toggle */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5 border-b pb-1.5">
                  <Truck className="w-4 h-4 text-amber-500" />
                  طريقة الاستلام والتوصيل:
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFulfillmentMethod('DELIVERY')}
                    className={`p-3 rounded-xl border text-right transition-all text-xs ${
                      fulfillmentMethod === 'DELIVERY'
                        ? 'border-amber-500 bg-amber-50/70 text-slate-950 font-bold shadow-sm'
                        : 'border-slate-200 text-slate-700 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 font-bold">
                      <Truck className="w-3.5 h-3.5 text-amber-600" />
                      شحن وتوصيل للموقع
                    </div>
                    <div className="text-[11px] text-slate-500">حسب مصفوفة المحافظات</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFulfillmentMethod('PICKUP')}
                    className={`p-3 rounded-xl border text-right transition-all text-xs ${
                      fulfillmentMethod === 'PICKUP'
                        ? 'border-amber-500 bg-amber-50/70 text-slate-950 font-bold shadow-sm'
                        : 'border-slate-200 text-slate-700 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 font-bold">
                      <Building2 className="w-3.5 h-3.5 text-amber-600" />
                      استلام مجاني من الفرع
                    </div>
                    <div className="text-[11px] text-emerald-800 font-bold">0 ج.م مصاريف شحن</div>
                  </button>
                </div>
              </div>

              {/* Dynamic Shipping Matrix Selection */}
              {fulfillmentMethod === 'DELIVERY' ? (
                <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Governorate */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        المحافظة *
                      </label>
                      <select
                        value={selectedZoneId}
                        onChange={(e) => {
                          setSelectedZoneId(e.target.value);
                          setSelectedSubZoneId('');
                        }}
                        className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500"
                      >
                        {zones.map((z) => (
                          <option key={z.id} value={z.id}>
                            {z.nameAr} ({z.mode === 'FLAT' ? `${z.defaultFee} ج.م شحن موحد` : 'حسب الحي'})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* District (if district mode) */}
                    {currentZone?.mode === 'DISTRICT' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          المنطقة / الحي *
                        </label>
                        <select
                          value={selectedSubZoneId}
                          onChange={(e) => setSelectedSubZoneId(e.target.value)}
                          className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500"
                        >
                          <option value="">اختر الحي لحساب الشحن</option>
                          {currentZone.subZones
                            .filter((s) => s.isActive)
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.nameAr} ({s.shippingFee} ج.م)
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Shipping Fee Indicator */}
                  <div
                    className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-between ${
                      isShippingAvailable
                        ? 'bg-amber-100/70 text-amber-950 border border-amber-300'
                        : 'bg-red-100 text-red-900 border border-red-300'
                    }`}
                  >
                    <span>{shippingMessage}</span>
                    {isShippingAvailable && (
                      <span className="font-black text-sm">{shippingFee} ج.م</span>
                    )}
                  </div>

                  {/* Detailed Address */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      العنوان التفصيلي وموقع العمل *
                    </label>
                    <textarea
                      rows={2}
                      placeholder="اسم الشارع، رقم العقار، الدور، اسم الشركة أو رقم الشقة، علامة مميزة..."
                      value={addressDetails}
                      onChange={(e) => setAddressDetails(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Delivery Instructions */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      تعليمات التسليم (اختياري)
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: الاتصال قبل الوصول بنصف ساعة، التسليم للمقاول بالموقع"
                      value={deliveryInstructions}
                      onChange={(e) => setDeliveryInstructions(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              ) : (
                /* Pickup Branch Selection */
                <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-800">
                    اختر الفرع للاستلام الفوري:
                  </label>
                  <div className="space-y-2">
                    {branches.map((b) => (
                      <label
                        key={b.id}
                        className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                          selectedBranchId === b.id
                            ? 'bg-amber-50 border-amber-500 text-slate-900 shadow-sm'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="branch"
                          checked={selectedBranchId === b.id}
                          onChange={() => setSelectedBranchId(b.id)}
                          className="mt-1 text-amber-500 focus:ring-amber-400"
                        />
                        <div className="text-xs">
                          <div className="font-black text-slate-900">{b.nameAr}</div>
                          <div className="text-slate-500 text-[11px] mt-0.5">{b.addressAr}</div>
                          <div className="text-amber-800 font-semibold text-[10px] mt-1">
                            مواعيد العمل: {b.workingHoursAr} • هاتف: {b.phone}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment Method Selector */}
              <div className="space-y-2.5">
                <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5 border-b pb-1.5">
                  <CreditCard className="w-4 h-4 text-amber-500" />
                  طريقة الدفع:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs transition-all ${
                      paymentMethod === 'CASH_ON_DELIVERY'
                        ? 'border-amber-500 bg-amber-50/70 font-bold text-slate-900'
                        : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'CASH_ON_DELIVERY'}
                      onChange={() => setPaymentMethod('CASH_ON_DELIVERY')}
                    />
                    <span>{fulfillmentMethod === 'PICKUP' ? 'الدفع نقداً عند استلام الفرع' : 'الدفع عند الاستلام (كاش)'}</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs transition-all ${
                      paymentMethod === 'PAYMOB_CARD'
                        ? 'border-amber-500 bg-amber-50/70 font-bold text-slate-900'
                        : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'PAYMOB_CARD'}
                      onChange={() => setPaymentMethod('PAYMOB_CARD')}
                    />
                    <div className="flex items-center gap-1">
                      <span>بطاقة بنكية (فيزا/ماستركارد)</span>
                      <span className="text-[10px] bg-blue-100 text-blue-800 px-1 rounded font-bold">بايموب</span>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs transition-all ${
                      paymentMethod === 'PAYMOB_WALLET'
                        ? 'border-amber-500 bg-amber-50/70 font-bold text-slate-900'
                        : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'PAYMOB_WALLET'}
                      onChange={() => setPaymentMethod('PAYMOB_WALLET')}
                    />
                    <div className="flex items-center gap-1">
                      <span>محافظ إلكترونية (فودافون كاش)</span>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs transition-all ${
                      paymentMethod === 'PAYMOB_VALU'
                        ? 'border-amber-500 bg-amber-50/70 font-bold text-slate-900'
                        : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'PAYMOB_VALU'}
                      onChange={() => setPaymentMethod('PAYMOB_VALU')}
                    />
                    <span>تقسيط عبر فاليو (valU)</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer & Financial Summary */}
        {items.length > 0 && (
          <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 space-y-3">
            {/* Breakdown */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>مجموع البضائع:</span>
                <span className="font-bold">{subtotal} ج.م</span>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between text-emerald-800 font-bold">
                  <span>خصومات العروض الترويجية:</span>
                  <span>- {discountTotal} ج.م</span>
                </div>
              )}
              {step === 'CHECKOUT' && (
                <div className="flex justify-between text-slate-600">
                  <span>مصاريف الشحن والتوصيل:</span>
                  <span className="font-bold">
                    {fulfillmentMethod === 'PICKUP'
                      ? '0 ج.م (استلام من الفرع)'
                      : `${shippingFee} ج.م`}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-slate-950 pt-2 border-t border-slate-200">
                <span>المبلغ الإجمالي المستحق:</span>
                <span className="text-amber-700 text-lg">{finalTotal} ج.م</span>
              </div>
            </div>

            {/* CTA Buttons */}
            {step === 'CART' ? (
              <button
                onClick={() => setStep('CHECKOUT')}
                className="w-full bg-amber-400 hover:bg-amber-500 active:scale-98 text-slate-950 font-black py-3 px-4 rounded-xl shadow-lg shadow-amber-500/20 text-sm flex items-center justify-center gap-2 transition-all"
              >
                <span>متابعة الشحن وتأكيد الطلب</span>
                <ArrowRight className="w-4 h-4 rotate-180" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep('CART')}
                  className="px-4 py-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs"
                >
                  الرجوع للسلة
                </button>
                <button
                  type="button"
                  onClick={handleSubmitOrder}
                  disabled={loading}
                  className="flex-1 bg-amber-400 hover:bg-amber-500 active:scale-98 disabled:opacity-50 text-slate-950 font-black py-3 px-4 rounded-xl shadow-lg shadow-amber-500/20 text-sm flex items-center justify-center gap-2 transition-all"
                >
                  {loading ? (
                    <span className="inline-block animate-spin mr-2">⏳</span>
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>{loading ? 'جاري تسجيل الطلب وتأكيد الحجز...' : 'تأكيد وإرسال الطلب الآن'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
