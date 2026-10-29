import { Clock, Flame, Sparkles, Zap } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Promotion } from '../types/index.ts';

interface FlashSaleBannerProps {
  promotion: Promotion;
  onExplore: () => void;
}

export const FlashSaleBanner: React.FC<FlashSaleBannerProps> = ({ promotion, onExplore }) => {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    function updateCountdown() {
      const now = new Date().getTime();
      const end = new Date(promotion.endDate).getTime();
      const diff = Math.max(0, end - now);

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds });
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [promotion.endDate]);

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-red-600 via-amber-600 to-amber-500 text-white rounded-2xl p-4 sm:p-5 shadow-xl shadow-amber-500/10 border border-amber-400/30">
      {/* Decorative background glows */}
      <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute right-10 -top-10 w-32 h-32 bg-amber-300/20 rounded-full blur-xl pointer-events-none" />

      <div className="relative flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Promotion Details */}
        <div className="flex items-center gap-3 text-center md:text-right">
          <div className="w-12 h-12 rounded-2xl bg-slate-950/30 backdrop-blur border border-white/20 flex items-center justify-center shrink-0">
            <Flame className="w-7 h-7 text-amber-200 fill-amber-300 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
              <span className="bg-slate-950/40 text-amber-300 text-xs font-black px-2.5 py-0.5 rounded-full border border-amber-300/30 flex items-center gap-1">
                <Zap className="w-3 h-3 fill-amber-300" />
                عرض الفلاش سيل المؤقت
              </span>
              <span className="text-xs text-amber-100 font-semibold hidden sm:inline">
                كميات محدودة لمشاريع التأسيس
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black tracking-tight text-white drop-shadow-sm">
              {promotion.titleAr}
            </h3>
          </div>
        </div>

        {/* Animated Countdown Timer */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-950 font-black">
            {/* Hours */}
            <div className="bg-slate-950 text-amber-400 border border-amber-400/30 rounded-xl px-3 py-1.5 text-center shadow-inner min-w-[50px]">
              <span className="text-lg sm:text-xl font-mono leading-none block">
                {String(timeLeft.hours).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-slate-400 font-sans block mt-0.5">ساعة</span>
            </div>
            <span className="text-white text-xl font-bold">:</span>

            {/* Minutes */}
            <div className="bg-slate-950 text-amber-400 border border-amber-400/30 rounded-xl px-3 py-1.5 text-center shadow-inner min-w-[50px]">
              <span className="text-lg sm:text-xl font-mono leading-none block">
                {String(timeLeft.minutes).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-slate-400 font-sans block mt-0.5">دقيقة</span>
            </div>
            <span className="text-white text-xl font-bold">:</span>

            {/* Seconds */}
            <div className="bg-slate-950 text-amber-400 border border-amber-400/30 rounded-xl px-3 py-1.5 text-center shadow-inner min-w-[50px]">
              <span className="text-lg sm:text-xl font-mono leading-none block text-red-400">
                {String(timeLeft.seconds).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-slate-400 font-sans block mt-0.5">ثانية</span>
            </div>
          </div>

          <button
            onClick={onExplore}
            className="hidden sm:flex items-center gap-1.5 bg-slate-950 hover:bg-slate-900 text-amber-300 font-extrabold text-xs px-4 py-3 rounded-xl border border-amber-400/30 shadow-lg hover:shadow-xl transition-all"
          >
            <span>استفد من العرض</span>
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
