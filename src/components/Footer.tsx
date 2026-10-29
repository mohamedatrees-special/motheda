import {
  Building2,
  CheckCircle,
  Clock,
  FileText,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Shield,
  ShieldCheck,
  Truck,
  Zap,
} from 'lucide-react';
import React from 'react';
import { PolicyType } from './PolicyModal.tsx';

interface FooterProps {
  onOpenPolicy: (type: PolicyType) => void;
  onOpenTracking: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenPolicy,
  onOpenTracking,
}) => {
  return (
    <footer className="bg-slate-950 text-white border-t border-slate-800 pt-12 pb-8">
      <div className="container mx-auto px-4">
        {/* Value Badges Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-10 border-b border-slate-800/80">
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h5 className="font-bold text-xs text-white">بضاعة أصلية معتمدة 100%</h5>
              <p className="text-[11px] text-slate-400">توكيلات السويدي، شنايدر، ABB، فينوس</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h5 className="font-bold text-xs text-white">شحن سريع لمواقع العمل</h5>
              <p className="text-[11px] text-slate-400">توصيل للورش والمواقع الإنشائية بالقاهرة والمحافظات</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h5 className="font-bold text-xs text-white">استلام مجاني من فروعنا</h5>
              <p className="text-[11px] text-slate-400">فروع السبتية، العتبة، والنزهة الجديدة</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h5 className="font-bold text-xs text-white">دفع آمن بالكامل</h5>
              <p className="text-[11px] text-slate-400">نقداً عند الاستلام أو إلكترونياً عبر بايموب</p>
            </div>
          </div>
        </div>

        {/* Links & Contacts */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 py-10 border-b border-slate-800/80 text-xs">
          {/* Brand Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                <Zap className="w-4 h-4 fill-slate-950 stroke-slate-950" />
              </div>
              <span className="font-black text-base text-white">
                المتحدة للأدوات الكهربائية
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              شركة متخصصة وموزع معتمد لحلول التأسيس والمهمات الكهربائية، الكابلات النحاسية النقية، القواطع الأوتوماتيكية، وأنظمة الإنارة الحديثة للمقاولين والمهندسين والورش.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <a
                href="https://wa.me/201012345678"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white px-3.5 py-2 rounded-xl font-bold transition-all w-fit active:scale-95"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>واتساب المبيعات والمقايسات</span>
              </a>
              <span className="text-[11px] text-slate-400">
                متاح يومياً من 9:00 ص حتى 10:00 م
              </span>
            </div>
          </div>

          {/* Store Branches */}
          <div className="space-y-3">
            <h4 className="font-black text-sm text-amber-400 flex items-center gap-1.5">
              <Building2 className="w-4 h-4" />
              فروعنا المعتمدة للاستلام:
            </h4>
            <ul className="space-y-2.5 text-slate-400">
              <li className="bg-slate-900/40 p-2 rounded-xl border border-slate-800/60">
                <span className="font-bold text-white block">فرع السبتية المركزي:</span>
                <span>14 شارع السبتية الرئيسي، وسط البلد، القاهرة</span>
              </li>
              <li className="bg-slate-900/40 p-2 rounded-xl border border-slate-800/60">
                <span className="font-bold text-white block">فرع العتبة وشارع عبد العزيز:</span>
                <span>ميدان العتبة، تقاطع شارع عبد العزيز، القاهرة</span>
              </li>
              <li className="bg-slate-900/40 p-2 rounded-xl border border-slate-800/60">
                <span className="font-bold text-white block">فرع النزهة ومصر الجديدة:</span>
                <span>شارع جوزيف تيتو، أمام مطار القاهرة، النزهة الجديدة</span>
              </li>
            </ul>
          </div>

          {/* Customer Services & Policies */}
          <div className="space-y-3">
            <h4 className="font-black text-sm text-amber-400">خدمات العملاء والمشروعات:</h4>
            <ul className="space-y-2 text-slate-400">
              <li>
                <button
                  onClick={onOpenTracking}
                  className="hover:text-amber-400 transition-colors font-semibold flex items-center gap-1.5"
                >
                  <Truck className="w-3.5 h-3.5 text-amber-400" />
                  <span>تتبع حالة الشحنة والطلبية</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenPolicy('SHIPPING')}
                  className="hover:text-amber-400 transition-colors font-semibold"
                >
                  مواعيد ومناطق الشحن والتوصيل
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenPolicy('REFUND')}
                  className="hover:text-amber-400 transition-colors font-semibold"
                >
                  سياسة الاستبدال والضمان المعتمد
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenPolicy('PRIVACY')}
                  className="hover:text-amber-400 transition-colors font-semibold"
                >
                  سياسة الخصوصية وأمان البيانات
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenPolicy('TERMS')}
                  className="hover:text-amber-400 transition-colors font-semibold"
                >
                  الشروط والأحكام التجارية
                </button>
              </li>
            </ul>
          </div>

          {/* Commercial Credentials & Support */}
          <div className="space-y-3">
            <h4 className="font-black text-sm text-amber-400 flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              البيانات الرسمية والاتصال:</h4>
            <p className="text-slate-400 leading-relaxed text-xs">
              شركة مسجلة رسمياً بالهيئة العامة للاستثمار والغرفة التجارية بالقاهرة. فواتير ضريبية إلكترونية معتمدة للمشروعات والشركات.
            </p>
            <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-300">
              <div><strong className="text-white">سجل تجاري:</strong> 104829 مكتب القاهرة</div>
              <div><strong className="text-white">بطاقة ضريبية:</strong> 482-194-921</div>
              <div><strong className="text-white">الخط الساخن:</strong> 01012345678 / 0225789123</div>
            </div>
            <div className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              فواتير ضريبية معتمدة لكل عملية شراء
            </div>
          </div>
        </div>

        {/* Bottom copyright & payment security */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <div>
            جميع الحقوق محفوظة © {new Date().getFullYear()} شركة المتحدة للأدوات والمهمات الكهربائية (Al-Motaheda Electrical Supplies).
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1 text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              دفع مشفر 256-bit عبر Paymob
            </span>
            <span className="text-slate-400">توصيل موثق بالقاهرة والجيزة والإسكندرية</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
