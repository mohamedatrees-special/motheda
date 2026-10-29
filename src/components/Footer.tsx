import {
  Building2,
  Clock,
  Heart,
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
  onOpenAdmin: () => void;
  onOpenTracking: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenPolicy,
  onOpenAdmin,
  onOpenTracking,
}) => {
  return (
    <footer className="bg-slate-950 text-white border-t border-slate-800 pt-12 pb-8">
      <div className="container mx-auto px-4">
        {/* Value Badges Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-10 border-b border-slate-800/80">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900/50 border border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h5 className="font-bold text-xs text-white">بضاعة أصلية معتمدة 100%</h5>
              <p className="text-[11px] text-slate-400">من السويدي، شنايدر، ABB، فينوس</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900/50 border border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h5 className="font-bold text-xs text-white">شحن سريع لمواقع العمل</h5>
              <p className="text-[11px] text-slate-400">توصيل للورش والمواقع السكنية والتجارية</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900/50 border border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h5 className="font-bold text-xs text-white">استلام مجاني من فروعنا</h5>
              <p className="text-[11px] text-slate-400">فروع السبتية، العتبة، والنزهة الجديدة</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900/50 border border-slate-800">
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
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                <Zap className="w-4 h-4 fill-slate-950 stroke-slate-950" />
              </div>
              <span className="font-black text-base text-white">
                المتحدة للأدوات الكهربائية
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              المورد والوكيل المعتمد لحلول التأسيس الكهربائي، الكابلات النحاسية، القواطع الأوتوماتيكية، وأنظمة الإنارة الحديثة للمشروعات والورش.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <a
                href="https://wa.me/201012345678"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white px-3 py-1.5 rounded-xl font-bold transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5 fill-white" />
                <span>واتساب المبيعات</span>
              </a>
            </div>
          </div>

          {/* Store Branches */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-amber-400 flex items-center gap-1.5">
              <Building2 className="w-4 h-4" />
              فروعنا المعتمدة للاستلام:
            </h4>
            <ul className="space-y-2 text-slate-400">
              <li>
                <span className="font-bold text-white block">فرع السبتية (المركزي):</span>
                <span>14 شارع السبتية الرئيسي، وسط البلد، القاهرة</span>
              </li>
              <li>
                <span className="font-bold text-white block">فرع العتبة:</span>
                <span>ميدان العتبة، تقاطع شارع عبد العزيز، القاهرة</span>
              </li>
              <li>
                <span className="font-bold text-white block">فرع النزهة الجديدة:</span>
                <span>شارع جوزيف تيتو، أمام مطار القاهرة</span>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-amber-400">روابط وخدمات العملاء:</h4>
            <ul className="space-y-2 text-slate-400">
              <li>
                <button
                  onClick={onOpenTracking}
                  className="hover:text-amber-400 transition-colors"
                >
                  تتبع حالة الشحنة والطلب
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenPolicy('SHIPPING')}
                  className="hover:text-amber-400 transition-colors"
                >
                  مواعيد ومناطق الشحن والتوصيل
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenPolicy('REFUND')}
                  className="hover:text-amber-400 transition-colors"
                >
                  سياسة الاستبدال والضمان المعتمد
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenPolicy('PRIVACY')}
                  className="hover:text-amber-400 transition-colors"
                >
                  سياسة الخصوصية وحماية البيانات
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenPolicy('TERMS')}
                  className="hover:text-amber-400 transition-colors"
                >
                  الشروط والأحكام التجارية
                </button>
              </li>
            </ul>
          </div>

          {/* Operations & Administration */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-amber-400">التشغيل والإدارة:</h4>
            <p className="text-slate-400 leading-relaxed">
              بوابة مخصصة لمهندسي المخازن ومسؤولي المبيعات لإدارة حركات المخزون ومراجعة مدفوعات بايموب.
            </p>
            <button
              onClick={onOpenAdmin}
              className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-400 font-bold py-2.5 rounded-xl transition-all"
            >
              دخول بوابة الإدارة (Admin Portal)
            </button>
            <div className="text-[11px] text-slate-500 font-mono">
              هاتف خدمة العملاء: 01012345678 / 0225789123
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div>
            جميع الحقوق محفوظة © {new Date().getFullYear()} شركة المتحدة للأدوات والمهمات الكهربائية (Al-Motaheda Electrical Supplies).
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>سجل تجاري وبطاقة ضريبية معتمدة</span>
            <span>بوابة دفع مؤمنة بواسطة Paymob</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
