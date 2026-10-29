/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Cable,
  CheckCircle,
  Clock,
  Filter,
  Flame,
  Lightbulb,
  MessageCircle,
  Phone,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  ToggleRight,
  Truck,
  Wrench,
  Zap,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { AdminPortal } from './components/AdminPortal.tsx';
import { CartDrawer, CartItem } from './components/CartDrawer.tsx';
import { FlashSaleBanner } from './components/FlashSaleBanner.tsx';
import { Footer } from './components/Footer.tsx';
import { GuestOrderTrackingModal } from './components/GuestOrderTrackingModal.tsx';
import { Navbar } from './components/Navbar.tsx';
import { OrderSuccessModal } from './components/OrderSuccessModal.tsx';
import { PaymobSandboxModal } from './components/PaymobSandboxModal.tsx';
import { PolicyModal, PolicyType } from './components/PolicyModal.tsx';
import { ProductCard } from './components/ProductCard.tsx';
import { ProductDetailsModal } from './components/ProductDetailsModal.tsx';
import { Category, Order, Product, Promotion } from './types/index.ts';

export default function App() {
  // Data States
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedVoltage, setSelectedVoltage] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<string>('featured');

  // Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Modals
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [activePolicy, setActivePolicy] = useState<PolicyType | null>(null);

  // Order & Payment Modals
  const [orderSuccessData, setOrderSuccessData] = useState<{
    order: Order;
    guestAccessToken: string;
    whatsappUrl: string;
  } | null>(null);
  const [paymobSandboxOrder, setPaymobSandboxOrder] = useState<Order | null>(null);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }

  // Load initial catalog data
  useEffect(() => {
    fetch('/api/catalog/categories')
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []))
      .catch((err) => console.error(err));

    fetch('/api/catalog/promotions')
      .then((r) => r.json())
      .then((d) => setPromotions(d.promotions || []))
      .catch((err) => console.error(err));
  }, []);

  // Fetch products with filters
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedCategory) params.append('category', selectedCategory);
    if (searchQuery) params.append('search', searchQuery);
    if (selectedBrand) params.append('brand', selectedBrand);
    if (selectedVoltage) params.append('voltage', selectedVoltage);
    if (sortOption !== 'featured') params.append('sort', sortOption);

    fetch(`/api/catalog/products?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setProducts(d.products || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [selectedCategory, searchQuery, selectedBrand, selectedVoltage, sortOption]);

  // Cart Handlers
  function handleAddToCart(product: Product, variantId?: string, quantity: number = 1) {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex(
        (i) => i.product.id === product.id && i.variantId === variantId
      );

      const variant = product.variants?.find((v) => v.id === variantId);
      const variantNameAr = variant ? variant.nameAr : undefined;
      const unitPrice = product.basePrice + (variant ? variant.priceDelta : 0);

      const promo = (product as any).activePromotion;
      let unitDiscount = 0;
      if (promo) {
        if (promo.discountType === 'PERCENTAGE') {
          unitDiscount = Math.round((unitPrice * promo.discountValue) / 100);
        } else if (promo.discountType === 'FIXED') {
          unitDiscount = Math.min(unitPrice, promo.discountValue);
        }
      }

      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + quantity,
        };
        return next;
      }

      return [
        ...prev,
        {
          product,
          variantId,
          variantNameAr,
          quantity,
          unitPrice,
          unitDiscount,
        },
      ];
    });

    showToast(`تمت إضافة "${product.titleAr}" إلى سلة المشتريات.`);
  }

  function handleUpdateQuantity(productId: string, variantId: string | undefined, delta: number) {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId && item.variantId === variantId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  }

  function handleRemoveItem(productId: string, variantId: string | undefined) {
    setCartItems((prev) =>
      prev.filter((i) => !(i.product.id === productId && i.variantId === variantId))
    );
  }

  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Active Flash Sale promo for header banner
  const activeFlashSale = promotions.find((p) => p.isActive);

  // Known Brands for quick filters
  const brands = ['السويدي للكابلات', 'شنايدر إلكتريك', 'ABB', 'فينوس', 'لوجراند', 'UNI-T'];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-amber-400 selection:text-slate-950">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 bg-slate-900 text-white border border-amber-400/50 shadow-2xl px-4 py-3 rounded-2xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom duration-300">
          <CheckCircle className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Floating WhatsApp Quick Chat Pill */}
      <a
        href="https://wa.me/201012345678"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-40 bg-[#25D366] hover:bg-[#20ba59] active:scale-95 text-white p-3.5 sm:px-4 sm:py-3 rounded-full shadow-2xl shadow-emerald-950/30 flex items-center gap-2 font-bold text-xs transition-all"
        title="تواصل فوري عبر واتساب المتجر"
      >
        <MessageCircle className="w-5 h-5 fill-white stroke-none" />
        <span className="hidden sm:inline">واتساب المتجر</span>
      </a>

      {/* Navbar */}
      <Navbar
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={(id) => {
          setSelectedCategory(id);
          window.scrollTo({ top: 380, behavior: 'smooth' });
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        cartItemCount={cartItemCount}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenTracking={() => setIsTrackingOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
      />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white py-10 sm:py-14 border-b border-slate-800 relative overflow-hidden">
          {/* Subtle electric grid overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] opacity-[0.03] [background-size:16px_16px]" />

          <div className="container mx-auto px-4 relative">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-bold text-amber-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>سوق التأسيس والمهمات الكهربائية الأول في مصر</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight sm:leading-tight">
                توريد مباشر لكابلات <span className="text-amber-400">السويدي</span>، قواطع{' '}
                <span className="text-amber-400">شنايدر</span>، وحلول الإنارة للمقاولين
              </h1>
              <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
                شركة متخصصة في تجارة وتوريد مستلزمات الكهرباء السكنية والتجارية والمصانع. نوفر
                بضاعة معتمدة مع شهادات الضمان، شحن سريع للمواقع والورش، واستلام فوري مجاني من
                فروعنا بالسبتية والعتبة والنزهة.
              </p>

              {/* Quick Feature Chips */}
              <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-200">
                <span className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  بضاعة أصلية 100% معتمدة
                </span>
                <span className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60">
                  <Truck className="w-4 h-4 text-amber-400" />
                  شحن للمحافظات والمواقع
                </span>
                <span className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60">
                  <Zap className="w-4 h-4 text-sky-400" />
                  أسعار جملة وتأسيس
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Active Flash Sale Announcement */}
        {activeFlashSale && (
          <div className="container mx-auto px-4 -mt-5 relative z-10">
            <FlashSaleBanner
              promotion={activeFlashSale}
              onExplore={() => {
                setSelectedCategory('cat-cables');
                window.scrollTo({ top: 400, behavior: 'smooth' });
              }}
            />
          </div>
        )}

        {/* Main Catalog & Content Area */}
        <section className="container mx-auto px-4 py-8">
          {/* Filter & Sort Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm mb-6 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Filter className="w-4 h-4 text-amber-500" />
                <span>تصفية المهمات:</span>
              </div>

              {/* Sort selector */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">الترتيب حسب:</span>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-semibold text-slate-800 focus:outline-none focus:border-amber-400"
                >
                  <option value="featured">المقترح والأكثر مبيعاً</option>
                  <option value="price_asc">الأقل سعراً</option>
                  <option value="price_desc">الأعلى سعراً</option>
                  <option value="stock_low">الأوشك على النفاد</option>
                </select>
              </div>
            </div>

            {/* Brand Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
              <span className="text-slate-400 font-semibold whitespace-nowrap">الماركة:</span>
              <button
                onClick={() => setSelectedBrand(null)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                  selectedBrand === null
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                الكل
              </button>
              {brands.map((b) => (
                <button
                  key={b}
                  onClick={() => setSelectedBrand(selectedBrand === b ? null : b)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                    selectedBrand === b
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>

            {/* Voltage / Specs Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
              <span className="text-slate-400 font-semibold whitespace-nowrap">الجهد الكهربائي:</span>
              <button
                onClick={() => setSelectedVoltage(null)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                  selectedVoltage === null
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                جميع الجهود
              </button>
              <button
                onClick={() => setSelectedVoltage(selectedVoltage === '220V' ? null : '220V')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                  selectedVoltage === '220V'
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                ⚡ أحادي الطور (220V Single Phase)
              </button>
              <button
                onClick={() => setSelectedVoltage(selectedVoltage === '380V' ? null : '380V')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                  selectedVoltage === '380V'
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                ⚡ ثلاثي الطور (380V/400V 3-Phase)
              </button>
            </div>
          </div>

          {/* Catalog Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span>
                  {selectedCategory
                    ? categories.find((c) => c.id === selectedCategory)?.nameAr
                    : 'قائمة المهمات والأصناف الكهربائية'}
                </span>
                <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                  {products.length} صنف
                </span>
              </h2>

              {(selectedCategory || selectedBrand || selectedVoltage || searchQuery) && (
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setSelectedBrand(null);
                    setSelectedVoltage(null);
                    setSearchQuery('');
                  }}
                  className="text-xs text-amber-600 hover:text-amber-700 font-bold flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>إلغاء التصفية</span>
                </button>
              )}
            </div>

            {loading ? (
              <div className="py-20 text-center space-y-3">
                <div className="inline-block animate-spin text-amber-500 text-2xl">⚡</div>
                <p className="text-xs text-slate-500 font-bold">
                  جاري تحميل الأصناف وبيانات المخزون...
                </p>
              </div>
            ) : products.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
                <p className="text-sm font-bold text-slate-700">لا توجد أصناف مطابقة للبحث حالياً.</p>
                <p className="text-xs text-slate-500">
                  جرّب تغيير كلمات البحث أو اختيار ماركة أخرى من القائمة.
                </p>
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setSelectedBrand(null);
                    setSelectedVoltage(null);
                    setSearchQuery('');
                  }}
                  className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl transition-all"
                >
                  عرض كافة المنتجات
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product as any}
                    onAddToCart={handleAddToCart}
                    onOpenDetails={setSelectedProduct}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer
        onOpenPolicy={setActivePolicy}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenTracking={() => setIsTrackingOpen(true)}
      />

      {/* Modals Container */}
      <ProductDetailsModal
        product={selectedProduct as any}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={() => setCartItems([])}
        onOrderCreated={(order, token, whatsapp) => {
          setOrderSuccessData({ order, guestAccessToken: token, whatsappUrl: whatsapp });
        }}
        onOpenPaymobSandbox={(order) => {
          setPaymobSandboxOrder(order);
        }}
      />

      <OrderSuccessModal
        order={orderSuccessData?.order || null}
        guestAccessToken={orderSuccessData?.guestAccessToken || ''}
        whatsappUrl={orderSuccessData?.whatsappUrl || ''}
        onClose={() => setOrderSuccessData(null)}
        onOrderCancelled={() => {
          setOrderSuccessData(null);
          showToast('تم إلغاء الطلب بنجاح وإعادة البضائع للمخزن.');
        }}
      />

      <PaymobSandboxModal
        order={paymobSandboxOrder}
        isOpen={paymobSandboxOrder !== null}
        onClose={() => setPaymobSandboxOrder(null)}
        onPaymentCompleted={(updatedOrder) => {
          setPaymobSandboxOrder(null);
          setOrderSuccessData({
            order: updatedOrder,
            guestAccessToken: '',
            whatsappUrl: `https://wa.me/201012345678?text=${encodeURIComponent(
              `مرحباً متجر المتحدة، قمت بسداد طلبي رقم #${updatedOrder.orderNumber} عبر بايموب بقيمة ${updatedOrder.finalTotal} ج.م. برجاء تأكيد الشحن.`
            )}`,
          });
        }}
      />

      <GuestOrderTrackingModal
        isOpen={isTrackingOpen}
        onClose={() => setIsTrackingOpen(false)}
      />

      <AdminPortal isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />

      <PolicyModal type={activePolicy} onClose={() => setActivePolicy(null)} />
    </div>
  );
}
