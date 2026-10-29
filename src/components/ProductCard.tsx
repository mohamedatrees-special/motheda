import {
  AlertTriangle,
  Cable,
  Check,
  Eye,
  Info,
  Layers,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Zap,
} from 'lucide-react';
import React from 'react';
import { Product, Promotion } from '../types/index.ts';

interface ProductCardProps {
  product: Product & {
    activePromotion?: Promotion | null;
    isLowStock?: boolean;
    lowStockNoticeAr?: string | null;
  };
  onAddToCart: (product: Product, variantId?: string) => void;
  onOpenDetails: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  onOpenDetails,
}) => {
  const promo = product.activePromotion;
  let discountedPrice = product.basePrice;

  if (promo) {
    if (promo.discountType === 'PERCENTAGE') {
      discountedPrice = Math.round(product.basePrice * (1 - promo.discountValue / 100));
    } else if (promo.discountType === 'FIXED') {
      discountedPrice = Math.max(0, product.basePrice - promo.discountValue);
    }
  }

  const isOutOfStock = product.stockQuantity <= 0;

  return (
    <div className="group relative bg-white rounded-2xl border border-slate-200 hover:border-amber-400/80 shadow-sm hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-300 flex flex-col justify-between overflow-hidden">
      {/* Top Media & Badges */}
      <div className="relative aspect-4/3 bg-slate-100 overflow-hidden cursor-pointer" onClick={() => onOpenDetails(product)}>
        <img
          src={product.images[0] || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80'}
          alt={product.titleAr}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Brand Tag */}
        <div className="absolute top-2.5 right-2.5">
          <span className="bg-slate-900/85 backdrop-blur text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-sm border border-slate-700/50">
            {product.brand}
          </span>
        </div>

        {/* Promotion Badge */}
        {promo && (
          <div className="absolute top-2.5 left-2.5">
            <span className="bg-red-600 text-white text-[11px] font-black px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1 animate-pulse">
              <Zap className="w-3 h-3 fill-white" />
              {promo.discountType === 'PERCENTAGE'
                ? `خصم ${promo.discountValue}%`
                : `خصم ${promo.discountValue} ج.م`}
            </span>
          </div>
        )}

        {/* Quick View Overlay Button */}
        <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <span className="bg-white/95 text-slate-900 font-bold text-xs px-3.5 py-2 rounded-xl shadow-lg flex items-center gap-1.5 backdrop-blur">
            <Eye className="w-3.5 h-3.5 text-amber-500" />
            المواصفات الفنية
          </span>
        </div>
      </div>

      {/* Product Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* SKU & Category Code */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mb-1.5">
            <span>كود: {product.sku}</span>
            {product.warranty && (
              <span className="text-emerald-700 font-medium flex items-center gap-0.5 font-sans">
                <ShieldCheck className="w-3 h-3" />
                {product.warranty}
              </span>
            )}
          </div>

          {/* Title */}
          <h4
            onClick={() => onOpenDetails(product)}
            className="font-bold text-sm text-slate-900 hover:text-amber-600 transition-colors line-clamp-2 cursor-pointer leading-snug mb-2.5"
            title={product.titleAr}
          >
            {product.titleAr}
          </h4>

          {/* Technical Specs Tags */}
          <div className="flex flex-wrap items-center gap-1.5 mb-3 text-[11px]">
            {product.voltage && (
              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold border border-slate-200">
                ⚡ {product.voltage}
              </span>
            )}
            {product.amperage && (
              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold border border-slate-200">
                {product.amperage}
              </span>
            )}
            {product.wattage && (
              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold border border-slate-200">
                💡 {product.wattage}
              </span>
            )}
            {product.cableSpecs && (
              <span className="bg-amber-50 text-amber-900 px-2 py-0.5 rounded-md font-semibold border border-amber-200/60">
                📐 {product.cableSpecs}
              </span>
            )}
          </div>
        </div>

        {/* Low-stock warning requirement: باقي X قطع فقط في المخزن - اطلب الآن! */}
        {product.isLowStock && !isOutOfStock && (
          <div className="mb-3 bg-amber-50 border border-amber-300 text-amber-900 text-xs px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>{product.lowStockNoticeAr}</span>
          </div>
        )}

        {isOutOfStock && (
          <div className="mb-3 bg-slate-100 border border-slate-300 text-slate-500 text-xs px-2.5 py-1.5 rounded-xl font-bold text-center">
            نفدت الكمية بالمخزن حالياً
          </div>
        )}

        {/* Price & Action */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-black text-slate-900">
                {discountedPrice}
              </span>
              <span className="text-xs font-bold text-slate-600">ج.م</span>
            </div>
            {promo && (
              <span className="text-xs text-slate-400 line-through block">
                {product.basePrice} ج.م
              </span>
            )}
          </div>

          {/* Add to Cart button */}
          <button
            onClick={() => onAddToCart(product)}
            disabled={isOutOfStock}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
              isOutOfStock
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-amber-400 hover:bg-amber-500 active:scale-95 text-slate-950 shadow-amber-500/20'
            }`}
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>إضافة للسلة</span>
          </button>
        </div>
      </div>
    </div>
  );
};
