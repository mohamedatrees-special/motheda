import {
  Building2,
  CheckCircle,
  Menu,
  Phone,
  Search,
  Shield,
  ShoppingBag,
  Truck,
  X,
  Zap,
} from 'lucide-react';
import React, { useState } from 'react';
import { Category } from '../types/index.ts';
import { ElectricCircuit } from './ElectricCircuit.tsx';

interface NavbarProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (catId: string | null) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  cartItemCount: number;
  onOpenCart: () => void;
  onOpenTracking: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  cartItemCount,
  onOpenCart,
  onOpenTracking,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-2xl">
      {/* Top Announcement Bar */}
      <div
        className="bg-[#0051f2] text-white px-4 py-1.5 text-xs font-bold shadow-inner"
        style={{ backgroundColor: '#0051f2' }}
      >
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="truncate">
              شركة المتحدة للأدوات الكهربائية — وكيل وموزع معتمد (السويدي للكابلات، شنايدر، ABB، فينوس)
            </span>
          </div>
          <div className="hidden md:flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1">
              <Truck className="w-3.5 h-3.5" />
              توصيل فوري للمواقع والمشروعات
            </span>
            <span className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" />
              فروع الاستلام: السبتية • العتبة • النزهة
            </span>
            <a
              href="tel:01012345678"
              className="flex items-center gap-1 font-mono font-bold hover:underline"
            >
              <Phone className="w-3 h-3" />
              01012345678
            </a>
          </div>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          {/* Mobile Menu Toggle Button (>=44px touch target) */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700/60 active:scale-95 transition-all"
            aria-label="فتح القائمة الرئيسية"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Brand Logo & Name */}
          <div
            onClick={() => {
              onSelectCategory(null);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform shrink-0">
              <Zap className="w-6 h-6 fill-slate-950 stroke-slate-950 electric-spark" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-black tracking-tight text-white group-hover:text-amber-400 transition-colors">
                  المتحدة للأدوات الكهربائية
                </span>
                <span className="hidden sm:inline-block text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold">
                  سوق الكهرباء
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Al-Motaheda Electrical Supplies • تأسيس ومهمات مشروعات
              </p>
            </div>
          </div>

          {/* Desktop Search Bar */}
          <div className="flex-1 max-w-xl mx-2 hidden md:block">
            <div className="relative">
              <input
                type="text"
                placeholder="ابحث عن كابلات السويدي، قواطع شنايدر، بانل فينوس، ليد، سلك..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl pr-10 pl-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute left-3 top-2.5 text-xs text-slate-400 hover:text-white bg-slate-700 px-1.5 py-0.5 rounded"
                >
                  مسح
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons: strictly NO admin controls */}
          <div className="flex items-center gap-2">
            {/* Track Guest Order Button (>=44px touch target) */}
            <button
              onClick={onOpenTracking}
              className="hidden sm:flex min-h-[44px] items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-colors active:scale-95"
            >
              <Truck className="w-4 h-4 text-amber-400" />
              <span>تتبع طلبيتك</span>
            </button>

            {/* Cart Button (>=44px touch target) */}
            <button
              onClick={onOpenCart}
              className="min-h-[44px] min-w-[44px] relative flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black px-4 py-2 rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all active:scale-95"
              aria-label="سلة المشتريات"
            >
              <ShoppingBag className="w-5 h-5 shrink-0" />
              <span className="text-sm font-black hidden sm:inline">السلة</span>
              {cartItemCount > 0 && (
                <span className="bg-slate-950 text-amber-400 text-xs px-2 py-0.5 rounded-full font-black animate-pulse">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar (for < md screens) */}
        <div className="mt-2.5 md:hidden">
          <div className="relative">
            <input
              type="text"
              placeholder="ابحث بالاسم، الموديل، الماركة..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-10 pl-3 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
          </div>
        </div>

        {/* Desktop Category Navigation Bar */}
        <nav className="mt-3 pt-2 border-t border-slate-800/80 hidden sm:flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          <button
            onClick={() => onSelectCategory(null)}
            className={`whitespace-nowrap px-3.5 py-2 rounded-xl font-bold transition-all min-h-[38px] ${
              selectedCategory === null
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            جميع المهمات الكهربائية
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`whitespace-nowrap px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 min-h-[38px] ${
                selectedCategory === cat.id
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>{cat.nameAr}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Subtle Electric Current Border Line at header base */}
      <ElectricCircuit variant="line" className="opacity-75" />

      {/* Mobile Drawer Navigation (Slide-over for screens < md) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative w-full max-w-xs bg-slate-900 border-l border-slate-800 h-full p-5 flex flex-col justify-between overflow-y-auto z-10 shadow-2xl">
            <div className="space-y-6">
              {/* Header inside drawer */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black">
                    <Zap className="w-5 h-5 fill-slate-950" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-white">المتحدة للكهرباء</h3>
                    <p className="text-[11px] text-amber-400 font-semibold">موزع رسمي معتمد</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
                  aria-label="إغلاق القائمة"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Actions */}
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenTracking();
                  }}
                  className="w-full min-h-[44px] flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-bold"
                >
                  <Truck className="w-4 h-4 text-amber-400" />
                  <span>تتبع طلبيتك وشحنتك</span>
                </button>
                <a
                  href="tel:01012345678"
                  className="w-full min-h-[44px] flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-bold"
                >
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <span>اتصال مباشر: 01012345678</span>
                </a>
              </div>

              {/* Categories Navigation */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                  الأقسام والمهمات
                </h4>
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => {
                      onSelectCategory(null);
                      setMobileMenuOpen(false);
                    }}
                    className={`text-right px-3 py-2.5 rounded-xl text-xs font-bold min-h-[44px] flex items-center justify-between ${
                      selectedCategory === null
                        ? 'bg-amber-400 text-slate-950 font-black'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>جميع المهمات الكهربائية</span>
                    <Zap className="w-3.5 h-3.5" />
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        onSelectCategory(cat.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`text-right px-3 py-2.5 rounded-xl text-xs font-bold min-h-[44px] flex items-center justify-between ${
                        selectedCategory === cat.id
                          ? 'bg-amber-400 text-slate-950 font-black'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span>{cat.nameAr}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom info */}
            <div className="pt-6 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
              <p className="font-bold text-white">فروع الاستلام الفوري:</p>
              <p>السبتية • العتبة • النزهة الجديدة</p>
              <p className="text-[10px] text-slate-500 pt-1">
                خدمة عملاء المقاولين والورش: 0225789123
              </p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
