import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Minus,
  Plus,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Truck,
  X,
  Zap,
} from 'lucide-react';
import React, { useState } from 'react';
import { Product, Promotion } from '../types/index.ts';

interface ProductDetailsModalProps {
  product: (Product & { activePromotion?: Promotion | null; isLowStock?: boolean; lowStockNoticeAr?: string | null }) | null;
  onClose: () => void;
  onAddToCart: (product: Product, variantId?: string, quantity?: number) => void;
}

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  product,
  onClose,
  onAddToCart,
}) => {
  if (!product) return null;

  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(
    product.variants && product.variants.length > 0 ? product.variants[0].id : undefined
  );
  const [quantity, setQuantity] = useState<number>(1);

  const selectedVariant = product.variants?.find((v) => v.id === selectedVariantId);
  let basePrice = product.basePrice + (selectedVariant ? selectedVariant.priceDelta : 0);

  const promo = product.activePromotion;
  let finalUnitPrice = basePrice;
  if (promo) {
    if (promo.discountType === 'PERCENTAGE') {
      finalUnitPrice = Math.round(basePrice * (1 - promo.discountValue / 100));
    } else if (promo.discountType === 'FIXED') {
      finalUnitPrice = Math.max(0, basePrice - promo.discountValue);
    }
  }

  const isOutOfStock = product.stockQuantity <= 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-10 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Product Media */}
          <div className="bg-slate-100 p-6 flex flex-col justify-center items-center relative">
            <img
              src={product.images[0] || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80'}
              alt={product.titleAr}
              className="max-h-72 object-contain rounded-2xl shadow-md"
            />
            {promo && (
              <div className="mt-4 bg-red-600 text-white text-xs font-black px-3 py-1 rounded-xl shadow-md flex items-center gap-1.5">
                <Zap className="w-4 h-4 fill-white" />
                <span>عرض ترويجي نشط: خصم {promo.discountType === 'PERCENTAGE' ? `${promo.discountValue}%` : `${promo.discountValue} ج.م`}</span>
              </div>
            )}
          </div>

          {/* Product Details Form */}
          <div className="p-6 md:p-8 flex flex-col justify-between">
            <div>
              {/* Brand and SKU */}
              <div className="flex items-center justify-between text-xs text-slate-500 font-mono mb-2">
                <span className="bg-slate-900 text-white font-sans font-bold px-2.5 py-0.5 rounded-md">
                  {product.brand}
                </span>
                <span>كود: {product.sku}</span>
              </div>

              {/* Title */}
              <h2 className="text-xl font-black text-slate-900 leading-tight mb-3">
                {product.titleAr}
              </h2>

              {/* Description */}
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                {product.descriptionAr}
              </p>

              {/* Technical Specifications Matrix */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 mb-4 text-xs space-y-2">
                <div className="font-bold text-slate-800 flex items-center gap-1 mb-1">
                  <ShieldCheck className="w-4 h-4 text-amber-500" />
                  المواصفات والاعتمادات القياسية:
                </div>
                {product.voltage && (
                  <div className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span className="text-slate-500">جهد التشغيل:</span>
                    <span className="font-bold text-slate-800">{product.voltage}</span>
                  </div>
                )}
                {product.amperage && (
                  <div className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span className="text-slate-500">سعة القاطع / التيار:</span>
                    <span className="font-bold text-slate-800">{product.amperage}</span>
                  </div>
                )}
                {product.wattage && (
                  <div className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span className="text-slate-500">القدرة الكهربائية:</span>
                    <span className="font-bold text-slate-800">{product.wattage}</span>
                  </div>
                )}
                {product.cableSpecs && (
                  <div className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span className="text-slate-500">مواصفات النحاس والعزل:</span>
                    <span className="font-bold text-slate-800">{product.cableSpecs}</span>
                  </div>
                )}
                {product.warranty && (
                  <div className="flex justify-between pt-0.5 text-emerald-800 font-bold">
                    <span>الضمان والاستبدال:</span>
                    <span>{product.warranty}</span>
                  </div>
                )}
              </div>

              {/* Variants Selector (e.g. 50m / 100m wire roll) */}
              {product.variants && product.variants.length > 0 && (
                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-800 mb-2">
                    اختر المقاس أو الموديل:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {product.variants.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVariantId(v.id)}
                        className={`text-xs p-2.5 rounded-xl border text-right transition-all font-semibold ${
                          selectedVariantId === v.id
                            ? 'border-amber-500 bg-amber-50/70 text-slate-900 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="font-bold">{v.nameAr}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {v.priceDelta === 0 ? 'السعر الأساسي' : `${v.priceDelta > 0 ? '+' : ''}${v.priceDelta} ج.م`}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Low stock alert */}
              {product.isLowStock && !isOutOfStock && (
                <div className="mb-4 bg-amber-50 border border-amber-300 text-amber-900 text-xs px-3 py-2 rounded-xl font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{product.lowStockNoticeAr}</span>
                </div>
              )}
            </div>

            {/* Price & Add to Cart Bar */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-slate-900">
                    {finalUnitPrice * quantity}
                  </span>
                  <span className="text-xs font-bold text-slate-600">ج.م</span>
                </div>
                {promo && (
                  <span className="text-xs text-slate-400 line-through block">
                    {basePrice * quantity} ج.م
                  </span>
                )}
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 border border-slate-200">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 rounded-lg bg-white hover:bg-slate-200 flex items-center justify-center text-slate-700 font-bold"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center font-bold text-sm text-slate-900">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-8 h-8 rounded-lg bg-white hover:bg-slate-200 flex items-center justify-center text-slate-700 font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Add to Cart button */}
              <button
                onClick={() => {
                  onAddToCart(product, selectedVariantId, quantity);
                  onClose();
                }}
                disabled={isOutOfStock}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all shadow-md ${
                  isOutOfStock
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-amber-400 hover:bg-amber-500 active:scale-95 text-slate-950 shadow-amber-500/20'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>إضافة إلى السلة</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
