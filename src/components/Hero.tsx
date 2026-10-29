import {
  Award,
  Cable,
  CheckCircle2,
  ChevronLeft,
  Flame,
  Lightbulb,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Truck,
  Wrench,
  Zap,
} from 'lucide-react';
import React from 'react';
import { ElectricCircuit } from './ElectricCircuit.tsx';

interface HeroProps {
  onSelectCategory: (catId: string | null) => void;
  onExploreBrand: (brand: string) => void;
  onOpenPhone: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  onSelectCategory,
  onExploreBrand,
}) => {
  return (
    <section className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 text-white relative overflow-hidden border-b border-slate-800">
      {/* Background industrial grid pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] opacity-[0.04] [background-size:24px_24px] pointer-events-none" />

      {/* Top subtle electric pulse line */}
      <ElectricCircuit variant="line" className="opacity-90" />

      <div className="container mx-auto px-4 py-10 sm:py-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Main Hero Copy (8 cols on large screens) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Tag Badge */}
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3.5 py-1.5 rounded-full text-xs font-black text-amber-400 backdrop-blur-sm">
              <Zap className="w-3.5 h-3.5 fill-amber-400 stroke-none electric-spark" />
              <span>وكيل وتوريدات مشروعات التأسيس الكهربائي الأول في مصر</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight sm:leading-snug">
              المهمات الكهربائية الأصلية للمقاولين والورش
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 mt-1">
                بأسعار الجملة وفواتير ضريبية معتمدة
              </span>
            </h1>

            {/* Descriptive subhead */}
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
              توريد مباشر وفوري لكابلات <strong className="text-white">السويدي إلكتريك</strong> النحاسية المعتمدة، قواطع ولوحات توزيع <strong className="text-white">شنايدر إلكتريك</strong> و <strong className="text-white">ABB</strong>، وحلول الإنارة الذكية من <strong className="text-white">فينوس</strong>. استلام فوري من فروعنا بالسبتية والعتبة، أو شحن سريع لمواقع العمل بالقاهرة وكافة المحافظات.
            </p>

            {/* Quick Brand Badges */}
            <div className="pt-2">
              <span className="text-xs text-slate-400 font-semibold block mb-2">
                ماركات التأسيس المعتمدة:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  'السويدي للكابلات',
                  'شنايدر إلكتريك',
                  'ABB',
                  'فينوس',
                  'لوجراند',
                ].map((brand) => (
                  <button
                    key={brand}
                    onClick={() => onExploreBrand(brand)}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-amber-400 hover:text-slate-950 text-slate-200 border border-slate-700/70 text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <span>{brand}</span>
                    <ChevronLeft className="w-3 h-3 opacity-60" />
                  </button>
                ))}
              </div>
            </div>

            {/* Value Trust Points */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 text-xs text-slate-200">
              <div className="flex items-center gap-2 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold">نحاس أحمر أصلي 100%</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <Truck className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-semibold">شحن مباشر للمواقع</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
                <Award className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="font-semibold">ضمان التوكيل المعتمد</span>
              </div>
            </div>
          </div>

          {/* Quick Category Action Cards (5 cols on large screens) */}
          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              onClick={() => onSelectCategory('cat-cables')}
              className="group cursor-pointer bg-slate-800/70 hover:bg-slate-800 p-4 rounded-2xl border border-slate-700/80 hover:border-amber-400/80 transition-all duration-300 relative overflow-hidden shadow-lg active:scale-98"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold mb-3 border border-amber-500/20 group-hover:scale-110 transition-transform">
                <Cable className="w-5 h-5" />
              </div>
              <h3 className="font-black text-sm text-white group-hover:text-amber-400 transition-colors">
                كابلات وأسلاك نحاسية
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                لفات سلك 1.5مم إلى 16مم معتمدة من السويدي للمباني والمصانع.
              </p>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 mt-3">
                تصفح الكابلات <ChevronLeft className="w-3.5 h-3.5" />
              </span>
            </div>

            <div
              onClick={() => onSelectCategory('cat-breakers')}
              className="group cursor-pointer bg-slate-800/70 hover:bg-slate-800 p-4 rounded-2xl border border-slate-700/80 hover:border-amber-400/80 transition-all duration-300 relative overflow-hidden shadow-lg active:scale-98"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold mb-3 border border-blue-500/20 group-hover:scale-110 transition-transform">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-black text-sm text-white group-hover:text-amber-400 transition-colors">
                قواطع ولوحات توزيع
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                قواطع أحادية وثنائية وثلاثية من شنايدر إلكتريك وABB قدرة 6kA و 10kA.
              </p>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-400 mt-3">
                تصفح القواطع <ChevronLeft className="w-3.5 h-3.5" />
              </span>
            </div>

            <div
              onClick={() => onSelectCategory('cat-lighting')}
              className="group cursor-pointer bg-slate-800/70 hover:bg-slate-800 p-4 rounded-2xl border border-slate-700/80 hover:border-amber-400/80 transition-all duration-300 relative overflow-hidden shadow-lg active:scale-98"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold mb-3 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                <Lightbulb className="w-5 h-5" />
              </div>
              <h3 className="font-black text-sm text-white group-hover:text-amber-400 transition-colors">
                إنارة وليد وبانل
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                بانل ليد فينوس غاطس، سبوتات ديكورية، وكشافات واجهات خارجية موفرة للطاقة.
              </p>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 mt-3">
                تصفح الإنارة <ChevronLeft className="w-3.5 h-3.5" />
              </span>
            </div>

            <div
              onClick={() => onSelectCategory('cat-switches')}
              className="group cursor-pointer bg-slate-800/70 hover:bg-slate-800 p-4 rounded-2xl border border-slate-700/80 hover:border-amber-400/80 transition-all duration-300 relative overflow-hidden shadow-lg active:scale-98"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold mb-3 border border-purple-500/20 group-hover:scale-110 transition-transform">
                <Wrench className="w-5 h-5" />
              </div>
              <h3 className="font-black text-sm text-white group-hover:text-amber-400 transition-colors">
                مفاتيح وأفياش ديكورية
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                شاسيهات وأفياش ومقابس فينوس ولوجراند وبيتشينو بتشطيبات عصرية.
              </p>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-400 mt-3">
                تصفح المفاتيح <ChevronLeft className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom subtle electric pulse line */}
      <ElectricCircuit variant="line" className="opacity-90" />
    </section>
  );
};
