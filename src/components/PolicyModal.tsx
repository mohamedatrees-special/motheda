import { FileText, Shield, Truck, Undo2, X } from 'lucide-react';
import React from 'react';

export type PolicyType = 'PRIVACY' | 'TERMS' | 'SHIPPING' | 'REFUND';

interface PolicyModalProps {
  type: PolicyType | null;
  onClose: () => void;
}

export const PolicyModal: React.FC<PolicyModalProps> = ({ type, onClose }) => {
  if (!type) return null;

  const content: Record<
    PolicyType,
    { title: string; icon: React.ReactNode; body: string[] }
  > = {
    PRIVACY: {
      title: 'سياسة الخصوصية وحماية بيانات العملاء',
      icon: <Shield className="w-5 h-5 text-amber-500" />,
      body: [
        'تلتزم شركة المتحدة للأدوات الكهربائية بحماية خصوصية كافة عملائنا ومهندسي ومقاولي الكهرباء.',
        'نقوم بجمع بيانات الاسم ورقم الهاتف وعنوان موقع التوريد فقط لغرض إتمام الشحن وتأكيد الطلبات وإصدار الفواتير القانونية.',
        'لا نقوم بمشاركة أي أرقام هواتف أو بيانات موقع مع أي أطراف ثالثة باستثناء مندوب التوصيل المعتمد التابع للمتجر.',
        'يتم تشفير كافة كلمات المرور ورموز الدخول بأعلى معايير التشفير (Argon2 / SHA-256) لمنع أي وصول غير مصرح به.',
      ],
    },
    TERMS: {
      title: 'الشروط والأحكام والتعاقد التجاري',
      icon: <FileText className="w-5 h-5 text-amber-500" />,
      body: [
        'كافة المنتجات المعروضة في المتجر أصلية 100% ومطابقة للمواصفات القياسية المصرية (EOS) ومصنعة بواسطة كبرى الشركات المعتمدة (السويدي للكابلات، شنايدر إلكتريك، ABB، فينوس، لوجراند).',
        'تعتبر الأسعار سارية عند إتمام الطلب وحجز المخزون، وتخضع لتحديثات دورية طبقاً لأسعار النحاس والمعادن العالمية المعتمدة.',
        'يحق للعميل معاينة البضاعة ومطابقة الأختام والأكواد قبل الاستلام النهائي أو السداد لمندوب التوصيل.',
      ],
    },
    SHIPPING: {
      title: 'سياسة الشحن والتوصيل للمواقع والورش',
      icon: <Truck className="w-5 h-5 text-amber-500" />,
      body: [
        'نوفر خدمة الشحن السريع لمحافظات القاهرة الكبرى، الإسكندرية، محافظات الدلتا والقناة.',
        'يتم احتساب مصاريف الشحن بدقة بناءً على مصفوفة المحافظات والأحياء المعتمدة من إدارة المتجر.',
        'الاستلام من الفروع (فرع السبتية المركزي، فرع العتبة، فرع النزهة الجديدة) مجاني تماماً وبدون أي رسوم شحن إضافية.',
        'في حال وجود موقع عمل أو ورشة تستوجب تصاريح دخول خاصة، يرجى التنسيق المسبق مع خدمة العملاء عبر الواتساب.',
      ],
    },
    REFUND: {
      title: 'سياسة الاستبدال والاسترجاع والضمان',
      icon: <Undo2 className="w-5 h-5 text-amber-500" />,
      body: [
        'يحق للعميل استبدال أو استرجاع البضاعة خلال 14 يوماً من تاريخ الاستلام، بشرط أن تكون البضائع في حالتها الأصلية وبغلاف المصنع ولفات الأسلاك غير مقطوعة أو مستعملة.',
        'تخضع كافة القواطع ولوحات التوزيع وضمانات الليد لشهادة الضمان الصادرة من الوكيل المعتمد (شنايدر، فينوس، ABB) بفترات تصل حتى 10 سنوات على الأفياش والمفاتيح.',
        'في حال وجود أي عيب مصنعي مثبت، يتم الاستبدال الفوري بدون أي تكاليف شحن إضافية.',
      ],
    },
  };

  const current = content[type];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {current.icon}
            <h3 className="font-extrabold text-sm">{current.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs text-slate-700 leading-relaxed">
          {current.body.map((paragraph, index) => (
            <div key={index} className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
              <p>{paragraph}</p>
            </div>
          ))}

          <button
            onClick={onClose}
            className="mt-4 w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs transition-colors"
          >
            فهمت وموافق
          </button>
        </div>
      </div>
    </div>
  );
};
