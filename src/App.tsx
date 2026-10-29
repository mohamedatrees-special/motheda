/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Cable,
  CheckCircle,
  Filter,
  Flame,
  Lightbulb,
  MessageCircle,
  Phone,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Truck,
  Wrench,
  Zap,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { AdminPortal } from './components/AdminPortal.tsx';
import { CartDrawer, CartItem } from './components/CartDrawer.tsx';
import { ElectricCircuit } from './components/ElectricCircuit.tsx';
import { FlashSaleBanner } from './components/FlashSaleBanner.tsx';
import { Footer } from './components/Footer.tsx';
import { GuestOrderTrackingModal } from './components/GuestOrderTrackingModal.tsx';
import { Hero } from './components/Hero.tsx';
import { Navbar } from './components/Navbar.tsx';
import { OrderSuccessModal } from './components/OrderSuccessModal.tsx';
import { PaymobSandboxModal } from './components/PaymobSandboxModal.tsx';
import { PolicyModal, PolicyType } from './components/PolicyModal.tsx';
import { ProductCard } from './components/ProductCard.tsx';
import { ProductDetailsModal } from './components/ProductDetailsModal.tsx';
import { Category, Order, Product, Promotion } from './types/index.ts';

export default function App() {
  // Routing state for strict Phase 3 Customer / Admin separation
  const [currentPath, setCurrentPath] = useState(
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );

  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const isAdminRoute = currentPath === '/admin' || currentPath.startsWith('/admin/');

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

  // If visiting /admin directly, render dedicated admin portal without storefront leaks
  if (isAdminRoute) {
    return (
      <AdminPortal
        isOpen={true}
        onClose={() => {
          window.history.pushState({}, '', '/');
          setCurrentPath('/');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-amber-400 selection:text-slate-950">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 bg-slate-900 text-white border border-amber-400/50 shadow-2xl px-4 py-3 rounded-2xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom duration-300">
          <CheckCircle className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Floating WhatsApp Quick Chat Button */}
      <a
        href="https://wa.me/201012345678"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-40 bg-[#25D366] hover:bg-[#20ba59] active:scale-95 text-white p-3.5 sm:px-4 sm:py-3 rounded-full shadow-2xl shadow-emerald-950/30 flex items-center gap-2 font-black text-xs transition-all min-h-[44px]"
        title="تواصل فوري عبر واتساب المتجر"
      >
        <MessageCircle className="w-5 h-5 fill-white stroke-none" />
        <span className="hidden sm:inline">واتساب المتجر</span>
      </a>

      {/* Customer Navbar: Strictly zero admin controls */}
      <Navbar
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={(id) => {
          setSelectedCategory(id);
          const el = document.getElementById('catalog-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        cartItemCount={cartItemCount}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenTracking={() => setIsTrackingOpen(true)}
      />

      <main className="flex-1">
        {/* Standout Hero Section */}
        <Hero
          onSelectCategory={(catId) => {
            setSelectedCategory(catId);
            const el = document.getElementById('catalog-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          onExploreBrand={(brand) => {
            setSelectedBrand(brand);
            const el = document.getElementById('catalog-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          onOpenPhone={() => window.open('tel:01012345678')}
        />

        {/* Active Flash Sale Announcement */}
        {activeFlashSale && (
          <div className="container mx-auto px-4 -mt-5 relative z-10">
            <FlashSaleBanner
              promotion={activeFlashSale}
              onExplore={() => {
                setSelectedCategory('cat-cables');
                const el = document.getElementById('catalog-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            />
          </div>
        )}

        {/* Main Catalog & Content Area */}
        <section id="catalog-section" className="container mx-auto px-4 py-8 scroll-mt-24">
          {/* Filter & Sort Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm mb-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                <Filter className="w-4 h-4 text-amber-500" />
                <span>تصفية المهمات الكهربائية:</span>
              </div>

              {/* Sort selector */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-semibold">الترتيب حسب:</span>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none focus:border-amber-400 min-h-[40px]"
                >
                  <option value="featured">المقترح والأكثر طلباً</option>
                  <option value="price_asc">الأقل سعراً</option>
                  <option value="price_desc">الأعلى سعراً</option>
                  <option value="stock_low">الأوشك على النفاد</option>
                </select>
              </div>
            </div>

            {/* Brand Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
              <span className="text-slate-400 font-bold whitespace-nowrap">الماركة:</span>
              <button
                onClick={() => setSelectedBrand(null)}
                className={`min-h-[38px] px-3 py-1.5 rounded-xl font-black transition-all whitespace-nowrap ${
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
                  className={`min-h-[38px] px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
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
              <span className="text-slate-400 font-bold whitespace-nowrap">الجهد والطور:</span>
              <button
                onClick={() => setSelectedVoltage(null)}
                className={`min-h-[38px] px-3 py-1.5 rounded-xl font-black transition-all whitespace-nowrap ${
                  selectedVoltage === null
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                كافة الجهود
              </button>
              <button
                onClick={() => setSelectedVoltage(selectedVoltage === '220V' ? null : '220V')}
                className={`min-h-[38px] px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                  selectedVoltage === '220V'
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                ⚡ 220V أحادي الطور (Single Phase)
              </button>
              <button
                onClick={() => setSelectedVoltage(selectedVoltage === '380V' ? null : '380V')}
                className={`min-h-[38px] px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                  selectedVoltage === '380V'
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                ⚡ 380V ثلاثي الطور (3-Phase)
              </button>
            </div>
          </div>

          {/* Catalog Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
                <span>
                  {selectedCategory
                    ? categories.find((c) => c.id === selectedCategory)?.nameAr
                    : 'قائمة الأصناف والمهمات الكهربائية'}
                </span>
                <span className="text-xs bg-slate-200 text-slate-800 px-2.5 py-0.5 rounded-full font-black">
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
                  className="min-h-[36px] text-xs text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>إلغاء التصفية</span>
                </button>
              )}
            </div>

            {loading ? (
              <div className="py-20 text-center space-y-3">
                <div className="inline-block animate-spin text-amber-500 text-3xl">⚡</div>
                <p className="text-xs text-slate-500 font-bold">
                  جاري تحميل الأصناف وبيانات المخزون الفعلي...
                </p>
              </div>
            ) : products.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
                <p className="text-sm font-black text-slate-800">
                  لا توجد مهمات مطابقة لمعايير البحث الحالية.
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  يرجى تجربة تعديل كلمات البحث أو اختيار ماركة أخرى، أو الضغط على زر استعراض الكل.
                </p>
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setSelectedBrand(null);
                    setSelectedVoltage(null);
                    setSearchQuery('');
                  }}
                  className="min-h-[44px] bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl transition-all active:scale-95 shadow-md shadow-amber-500/20"
                >
                  استعراض كافة الأصناف
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

      {/* Customer Footer: Strictly zero admin controls */}
      <Footer
        onOpenPolicy={setActivePolicy}
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

      <PolicyModal type={activePolicy} onClose={() => setActivePolicy(null)} />
    </div>
  );
}
