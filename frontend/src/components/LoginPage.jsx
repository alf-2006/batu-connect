import React, { useState, useRef, useEffect } from 'react';
import UniversityLogo from './UniversityLogo';
import ThemeToggle from './ThemeToggle';
import {
  ArrowRight, Mail, Lock, Eye, EyeOff, ShieldCheck, GraduationCap,
  FileText, LogIn, UserPlus, Loader2, AlertCircle, User
} from 'lucide-react';

export default function LoginPage({ onLogin, onRegister, onBack, error, loading }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [universityId, setUniversityId] = useState('');
  const [department, setDepartment] = useState('تكنولوجيا المعلومات');

  const [showPassword, setShowPassword] = useState(false);
  const emailRef = useRef(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, [mode]);

  const emailFilled = email.trim().length > 0;
  const passFilled = password.length > 0;
  const nameFilled = mode === 'register' ? fullName.trim().length > 0 : true;
  const ready = emailFilled && passFilled && nameFilled;

  const submit = (e) => {
    e.preventDefault();
    if (!ready || loading) return;
    if (mode === 'login') {
      onLogin(email.trim(), password);
    } else {
      onRegister({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        universityId: universityId.trim(),
        department
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7f6] dark:bg-[#0b1220] flex flex-col justify-between transition-colors duration-300 font-sans dir-rtl">
      {/* ── Top Header Bar ── */}
      <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between">
          
          {/* Logo & Platform Name (Right in RTL) */}
          <div className="flex items-center gap-3">
            <UniversityLogo className="w-11 h-10 shrink-0" />
            <div className="leading-snug">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white font-display tracking-normal">
                جامعة برج العرب التكنولوجية
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">منصة التواصل الأكاديمي</p>
            </div>
          </div>

          {/* Left Navigation Controls (Left in RTL) */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-[#0f766e] dark:hover:text-[#2e9b9b] px-3.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              <span>رجوع للرئيسية</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
            <ThemeToggle />
          </div>

        </div>
      </header>

      {/* ── Main Access Section ── */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 flex items-center justify-center w-full relative overflow-hidden">
        {/* Ambient Decorative Blurs */}
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-[#2e9b9b]/12 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-10 left-10 w-72 h-72 bg-[#8cbf3f]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="w-full grid lg:grid-cols-12 gap-8 lg:gap-14 items-center relative z-10">
          
          {/* ══ Right Side: Information & Welcome Message (7 cols) ══ */}
          <div className="lg:col-span-7 space-y-6 text-right order-1">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0f766e]/10 border border-[#0f766e]/20 text-[#0f766e] dark:text-[#2e9b9b] text-xs font-mono font-bold">
              BATU / ACCESS
            </div>

            {/* Title with flex layout and explicit physical gap to guarantee ZERO letter overlap */}
            <h1 className="text-2xl sm:text-3xl lg:text-[2.4rem] font-extrabold text-slate-900 dark:text-white font-display tracking-normal flex flex-col gap-3 py-1">
              <span className="block leading-relaxed">مرحبًا بك في منصة</span>
              <span className="block leading-relaxed text-[#0f766e] dark:text-[#2e9b9b]">التواصل الأكاديمي</span>
            </h1>

            <p className="text-sm sm:text-[15px] leading-[1.85] text-slate-600 dark:text-slate-300 max-w-xl font-medium tracking-normal">
              ادخل بحسابك الجامعي للوصول إلى أعضاء هيئة التدريس ومتابعة استفساراتك بسهولة وأمان.
            </p>

            {/* Feature Pills List */}
            <div className="space-y-3.5 pt-2 max-w-md">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 shadow-sm text-xs font-bold text-slate-800 dark:text-slate-200">
                <div className="w-9 h-9 rounded-xl bg-[#0f766e]/10 text-[#0f766e] dark:text-[#2e9b9b] flex items-center justify-center shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <span>تواصل مباشر مع أعضاء هيئة التدريس</span>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 shadow-sm text-xs font-bold text-slate-800 dark:text-slate-200">
                <div className="w-9 h-9 rounded-xl bg-[#0f766e]/10 text-[#0f766e] dark:text-[#2e9b9b] flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <span>متابعة الطلبات والاستفسارات</span>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 shadow-sm text-xs font-bold text-slate-800 dark:text-slate-200">
                <div className="w-9 h-9 rounded-xl bg-[#0f766e]/10 text-[#0f766e] dark:text-[#2e9b9b] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span>بياناتك محمية وفقًا للمعاير الأكاديمية</span>
              </div>
            </div>
          </div>

          {/* ══ Left Side: Login Card Form (5 cols) ══ */}
          <div className="lg:col-span-5 order-2 flex justify-center">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[28px] shadow-2xl border border-slate-200/90 dark:border-slate-800 p-7 sm:p-8 relative">
              
              {/* Decorative Accent Dots Top Left of Card */}
              <div className="absolute top-4 left-4 opacity-20 pointer-events-none hidden sm:block"
                style={{
                  backgroundImage: 'radial-gradient(#0f766e 1.5px, transparent 1.5px)',
                  backgroundSize: '8px 8px',
                  width: '60px',
                  height: '60px'
                }}
              />

              {/* Card Header Lock Icon */}
              <div className="w-16 h-16 rounded-full bg-[#0f766e]/10 text-[#0f766e] dark:text-[#2e9b9b] flex items-center justify-center mx-auto mb-4 shadow-sm border border-[#0f766e]/20">
                {mode === 'login' ? (
                  <Lock className="w-7 h-7 text-[#0f766e] dark:text-[#2e9b9b]" />
                ) : (
                  <UserPlus className="w-7 h-7 text-[#0f766e] dark:text-[#2e9b9b]" />
                )}
              </div>

              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1 tracking-normal font-display">
                  {mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {mode === 'login' ? 'باستخدام بريدك الجامعي' : 'أدخل بياناتك للتواصل المباشر مع أساتذتك'}
                </p>
              </div>

              {/* Form Body */}
              <form onSubmit={submit} className="space-y-4" noValidate>
                
                {mode === 'register' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      الاسم الكامل
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pr-10 pl-4 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f766e] transition-all"
                        placeholder="أحمد علي الكومي"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        disabled={loading}
                      />
                      <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                    </div>
                  </div>
                )}

                {/* Email Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    البريد الجامعي
                  </label>
                  <div className="relative">
                    <input
                      ref={emailRef}
                      type="email"
                      required
                      dir="ltr"
                      className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pr-10 pl-4 text-xs text-left text-slate-900 dark:text-white font-mono placeholder:text-slate-400 placeholder:text-left focus:outline-none focus:ring-2 focus:ring-[#0f766e] transition-all"
                      placeholder="name@batu.edu.eg"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    كلمة المرور
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      dir="ltr"
                      className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pr-10 pl-10 text-xs text-left text-slate-900 dark:text-white font-mono placeholder:text-slate-400 placeholder:text-left focus:outline-none focus:ring-2 focus:ring-[#0f766e] transition-all"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-3.5 text-slate-400 hover:text-[#0f766e] transition-colors p-0.5"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {mode === 'register' && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">الرقم الجامعي</label>
                      <input
                        type="text"
                        className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white font-mono"
                        placeholder="202410882"
                        value={universityId}
                        onChange={(e) => setUniversityId(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">القسم</label>
                      <select
                        className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                      >
                        <option value="تكنولوجيا المعلومات">تكنولوجيا المعلومات</option>
                        <option value="علوم الحاسب">علوم الحاسب</option>
                        <option value="الشبكات والأمن">الشبكات والأمن</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {error && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Primary Submit Button */}
                <button
                  type="submit"
                  disabled={!ready || loading}
                  className="w-full py-3.5 rounded-xl bg-[#0f766e] hover:bg-[#0d655e] text-white font-bold text-sm shadow-md hover:shadow-lg focus:ring-2 focus:ring-[#0f766e] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري المعالجة...</span>
                    </>
                  ) : mode === 'login' ? (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>تسجيل الدخول</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>إنشاء حساب جديد</span>
                    </>
                  )}
                </button>



              </form>
            </div>
          </div>

        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 py-4 text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
        <p>جميع الحقوق محفوظة لجامعة برج العرب التكنولوجية © 2026</p>
      </footer>
    </div>
  );
}
