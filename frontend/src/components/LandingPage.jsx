import React, { useState } from 'react';
import UniversityLogo from './UniversityLogo';
import ThemeToggle from './ThemeToggle';
import PhoneMockup from './PhoneMockup';
import {
  MessageSquare, Search, ShieldCheck, ShieldAlert, BadgeCheck, Gift,
  Building2, UserRound, Send, ArrowLeft, ArrowDown, ChevronLeft, ChevronRight,
  Mail, Phone, LogIn, MessageCircle, Plus, Minus, Star, Sparkles, CheckCircle2,
  Lock, Globe, FileText
} from 'lucide-react';

const FEATURES = [
  {
    icon: <ShieldCheck className="w-10 h-10 text-[#2e9b9b]" />,
    title: 'منصة رسمية ومعتمدة',
    desc: 'جميع البيانات والخدمات معتمدة ورسمية من جامعة برج العرب التكنولوجية لضمان الخصوصية التامة وسرية التواصل.'
  },
  {
    icon: <Search className="w-10 h-10 text-[#2e9b9b]" />,
    title: 'بحث سريع ودقيق',
    desc: 'استعرض وابحث عن عضو هيئة التدريس المناسب حسب القسم أو التخصص أو المادة الأكاديمية في ثوانٍ معدودة وبدقة عالية.'
  },
  {
    icon: <MessageSquare className="w-10 h-10 text-[#2e9b9b]" />,
    title: 'تواصل مباشر عبر المنصة',
    desc: 'ابدأ المحادثة مباشرة مع الدكتور عبر المنصة بضغطة واحدة، مع حماية كاملة وخصوصية تامة.'
  }
];

const STEPS = [
  {
    n: '1',
    icon: <Building2 className="w-6 h-6 text-[#2e9b9b]" />,
    title: 'اختر القسم والتخصص',
    desc: 'تصفح قائمة الأقسام الأكاديمية واختر القسم أو المادة الدراسية التي تبحث عنها.'
  },
  {
    n: '2',
    icon: <UserRound className="w-6 h-6 text-[#2e9b9b]" />,
    title: 'حدد الدكتور المناسب',
    desc: 'استعرض الملف الأكاديمي للدكتور واطلع على تخصصاته والأوقات المتاحة.'
  },
  {
    n: '3',
    icon: <Send className="w-6 h-6 text-[#2e9b9b]" />,
    title: 'ابدأ المحادثة عبر المنصة',
    desc: 'أرسل سؤالك ليصل مباشرة إلى الدكتور عبر المنصة وتابع الرد في الواجهة لحظياً.'
  }
];

const DOCTORS = [
  { name: 'د. إيمان فؤاد', dept: 'تكنولوجيا المعلومات', spec: 'هندسة البرمجيات والتطوير', initials: 'إ.ف' },
  { name: 'د. أحمد محمود', dept: 'علوم الحاسب والذكاء الاصطناعي', spec: 'تعلم الآلة والبيانات', initials: 'أ.م' },
  { name: 'د. محمد السيد', dept: 'الأمن السيبراني والشبكات', spec: 'أمن الشبكات والتشفير', initials: 'م.س' },
  { name: 'د. منى عبد الرحمن', dept: 'نظم المعلومات التكنولوجية', spec: 'قواعد البيانات والحوسبة', initials: 'م.ع' }
];

const FAQS = [
  {
    q: 'هل المنصة مجانية لجميع الطلاب؟',
    a: 'نعم، المنصة مجانية تماماً وبشكل كامل لجميع طلاب جامعة برج العرب التكنولوجية ولا تتطلب أي رسوم.'
  },
  {
    q: 'هل يظهر رقم هاتف الدكتور الشخصي للطلاب؟',
    a: 'لا إطلاقاً. جميع أرقام أعضاء هيئة التدريس مشفرة بتقنية AES-256-GCM ولا تظهر للطلاب نهائياً — تصل الرسالة للدكتور عبر بوابتنا دون كشف الأرقام.'
  },
  {
    q: 'كيف ومتى أستقبل الرد على استفساري؟',
    a: 'يتلقى الدكتور سؤالك ويظهر رده فوراً عبر المنصة بفضل تقنية البث اللحظي Socket.io.'
  },
  {
    q: 'ماذا أفعل إذا لم أجد الدكتور الخاص بمادتي في القائمة؟',
    a: 'يمكنك التواصل مع إدارة القسم أو إرسال طلب إضافة عبر نموذج التواصل بالأسفل وسيقوم فريق تقنية المعلومات بإضافته فوراً.'
  }
];

export default function LandingPage({ onGetStarted }) {
  const [openFaq, setOpenFaq] = useState(0);

  const scrollTo = (id) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="min-h-screen bg-theme-primary transition-colors duration-300">
      {/* ══════════ Navbar (تحسين الحجم والمسافات) ══════════ */}
      <header className="sticky top-0 z-40 bg-[var(--bg-glass)] backdrop-blur-xl border-b border-theme transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[74px] flex items-center justify-between gap-6">
          {/* البراند - شعار أكبر بـ 20% */}
          <div className="flex items-center gap-3.5 min-w-0">
            <UniversityLogo className="w-14 h-12 shrink-0 transform hover:scale-105 transition-transform" />
            <div className="leading-tight min-w-0">
              <div className="text-[15.5px] font-bold text-theme-primary truncate font-display">
                جامعة برج العرب التكنولوجية
              </div>
              <div className="text-[11px] text-theme-muted truncate">منصة التواصل الأكاديمي المباشر</div>
            </div>
          </div>

          {/* التنقل - مسافة gap-8 (32px) بين الروابط */}
          <nav className="hidden md:flex items-center gap-8">
            {[
              { label: 'الرئيسية', id: 'hero' },
              { label: 'المميزات', id: 'features' },
              { label: 'كيف تعمل', id: 'how-it-works' }
            ].map((item, i) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className="relative text-[14.5px] font-semibold text-theme-secondary hover:text-[#2e9b9b] focus:text-[#2e9b9b] focus:outline-none transition-colors py-1"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <ThemeToggle />
            <button
              onClick={onGetStarted}
              className="btn btn-primary px-6 py-2.5 text-[14px] font-bold focus:ring-2 focus:ring-[#2e9b9b] focus:outline-none active:scale-[0.98] transition-all"
            >
              <LogIn className="w-4 h-4" />
              <span>تسجيل الدخول</span>
            </button>
          </div>
        </div>
      </header>

      {/* ══════════ Hero Section (نسبة 50%/50% وارتفاع متوازن) ══════════ */}
      <section
        id="hero"
        className="relative overflow-hidden border-b border-theme py-10 lg:py-14"
        style={{
          background:
            'linear-gradient(140deg, var(--hero-gradient-from) 0%, var(--hero-gradient-via) 55%, var(--hero-gradient-to) 100%)'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* جهة النص (50%) */}
            <div className="text-center lg:text-right order-2 lg:order-1 space-y-8 py-4">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#2e9b9b]/10 border border-[#2e9b9b]/25 text-[#2e9b9b] text-xs sm:text-sm font-bold shadow-sm">
                  <Sparkles className="w-4 h-4 text-[#8cbf3f]" />
                  <span>المنصة الرسمية المعتمدة للتواصل الأكاديمي</span>
                </div>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-theme-primary leading-[1.65] lg:leading-[1.6] tracking-normal">
                تواصل مع أعضاء هيئة التدريس <span className="text-[#2e9b9b]">بسهولة</span>
              </h1>

              <p className="text-base sm:text-lg leading-[1.85] text-theme-secondary max-w-xl mx-auto lg:mx-0 font-medium pt-1">
                ابحث عن عضو هيئة التدريس المناسب وابدأ التواصل معه مباشرة عبر المنصة الرسمية لجامعة برج العرب التكنولوجية.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4 pb-2">
                <button
                  onClick={onGetStarted}
                  className="w-full sm:w-auto btn btn-primary px-8 py-3.5 text-[15px] font-bold focus:ring-2 focus:ring-[#2e9b9b] focus:outline-none active:scale-[0.98] transition-all shadow-lg shadow-[#2e9b9b]/20"
                >
                  <MessageSquare className="w-4.5 h-4.5" />
                  ابدأ التواصل الآن
                </button>
                <button
                  onClick={() => scrollTo('how-it-works')}
                  className="w-full sm:w-auto btn btn-secondary px-7 py-3.5 text-[15px] font-bold focus:ring-2 focus:ring-[#2e9b9b] focus:outline-none active:scale-[0.98] transition-all"
                >
                  كيف تعمل المنصة؟
                </button>
              </div>

              {/* شرائط الثقة */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-8 gap-y-4 pt-6 border-t border-theme/60">
                {[
                  { icon: <ShieldCheck className="w-4 h-4" />, label: 'حماية وخصوصية تامة' },
                  { icon: <BadgeCheck className="w-4 h-4" />, label: 'معتمد رسمياً' },
                  { icon: <Gift className="w-4 h-4" />, label: 'مجاني للطلاب' }
                ].map((t) => (
                  <div key={t.label} className="flex items-center gap-2 text-xs sm:text-sm font-bold text-theme-secondary">
                    <span className="text-[#2e9b9b]">{t.icon}</span>
                    {t.label}
                  </div>
                ))}
              </div>
            </div>

            {/* جهة الموبايل والمحاكاة البصرية (50%) */}
            <div className="order-1 lg:order-2 flex justify-center items-center">
              <PhoneMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ قسم المميزات (كروت غنية ورموز 40px) ══════════ */}
      <section id="features" className="py-12 lg:py-16 bg-theme-surface border-b border-theme">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <h2 className="section-title">مميزات المنصة الأكاديمية</h2>
            <p className="text-sm text-theme-muted">مصممة لتقديم أفضل تجربة تواصل آمنة وسريعة بين الطالب وأستاذ المادة</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="surface-card rounded-2xl p-7 flex flex-col items-start gap-4 border border-theme hover:border-[#2e9b9b]/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
              >
                {/* أيقونة كبيرة بحجم 40px */}
                <div className="w-16 h-16 rounded-2xl bg-[#2e9b9b]/12 flex items-center justify-center shrink-0 group-hover:bg-[#2e9b9b] group-hover:text-white transition-colors">
                  {f.icon}
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-theme-primary">{f.title}</h3>
                  <p className="text-[13.5px] leading-relaxed text-theme-secondary font-medium">
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ كيف تعمل المنصة (Timeline داخل كروت) ══════════ */}
      <section id="how-it-works" className="py-12 lg:py-16 bg-theme-primary border-b border-theme">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <h2 className="section-title">كيف تعمل المنصة؟</h2>
            <p className="text-sm text-theme-muted">ثلاث خطوات بسيطة تبدأ بها تواصلك الأكاديمي مباشرة</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 relative">
            {STEPS.map((s, idx) => (
              <div
                key={s.n}
                className="surface-card rounded-2xl p-6 border border-theme hover:border-[#2e9b9b]/50 hover:shadow-lg transition-all text-center flex flex-col items-center relative"
              >
                {/* رقم الخطوة */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#2e9b9b] to-[#22696a] text-white text-lg font-black flex items-center justify-center shadow-brand mb-4">
                  {s.n}
                </div>

                <div className="w-12 h-12 rounded-xl bg-[#2e9b9b]/10 flex items-center justify-center mb-3">
                  {s.icon}
                </div>

                <h3 className="text-base font-bold text-theme-primary mb-2">{s.title}</h3>
                <p className="text-xs leading-relaxed text-theme-muted">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ Mid-Page Call To Action (CTA) ══════════ */}
      <section className="py-10 bg-gradient-to-r from-[#2e9b9b] to-[#22696a] text-white shadow-inner">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-4">
          <h2 className="text-2xl sm:text-3xl font-extrabold">جاهز للتواصل مع أستاذ المادة الآن؟</h2>
          <p className="text-sm sm:text-base text-white/90 max-w-xl mx-auto font-medium">
            لا تتردد في طرح استفساراتك الأكاديمية والمتابعة مع أعضاء هيئة التدريس بكل سهولة وأمان.
          </p>
          <div className="pt-2">
            <button
              onClick={onGetStarted}
              className="px-8 py-3.5 rounded-xl bg-white text-[#22696a] font-extrabold text-sm hover:bg-slate-100 hover:shadow-xl focus:ring-2 focus:ring-white active:scale-95 transition-all inline-flex items-center gap-2"
            >
              <MessageSquare className="w-4.5 h-4.5 text-[#22696a]" />
              ابدأ التواصل الآن
            </button>
          </div>
        </div>
      </section>

      {/* ══════════ الفوتر ══════════ */}
      <footer className="bg-theme-surface border-t border-theme">
        {/* الشريط السفلي */}
        <div className="bg-[#22696a] text-center py-4 px-4">
          <p className="text-xs text-white/90 font-bold">
            جميع الحقوق محفوظة لجامعة برج العرب التكنولوجية © 2026 • قسم تكنولوجيا المعلومات
          </p>
        </div>
      </footer>
    </div>
  );
}
