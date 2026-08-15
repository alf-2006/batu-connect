import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X, Smartphone, Sparkles, CheckCircle2 } from 'lucide-react';

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode (installed as app)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    if (isStandalone) {
      setInstalled(true);
      return;
    }

    // Check iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(iosDevice);

    if (iosDevice && !isStandalone) {
      setShowBanner(true);
    }

    // Capture Chrome/Android beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIosGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstalled(true);
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  if (installed || !showBanner) return null;

  return (
    <div className="bg-gradient-to-r from-[#0f766e] via-teal-800 to-slate-900 text-white px-4 py-3 border-b border-teal-500/30 shadow-lg relative dir-rtl transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20">
            <Smartphone className="w-5 h-5 text-teal-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-extrabold font-display">
                ثبّت منصة التواصل الأكاديمي كتطبيق على هاتفك
              </h4>
              <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-200 border border-teal-400/30 text-[10px] font-bold">
                PWA App
              </span>
            </div>
            <p className="text-[11px] text-teal-100/80 font-medium">
              تصفح سريع جداً بدون فتح المتصفح واستلام إشعارات الردود على شاشة هاتفك مباشرة!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleInstallClick}
            className="px-4 py-2 rounded-xl bg-white hover:bg-teal-50 text-[#0f766e] font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 active:scale-95"
          >
            <Download className="w-4 h-4 text-[#0f766e]" />
            <span>{isIOS ? 'طريقة التثبيت للآيفون' : 'تثبيت التطبيق الآن'}</span>
          </button>

          <button
            onClick={() => setShowBanner(false)}
            className="p-1.5 rounded-xl hover:bg-white/10 text-teal-200 hover:text-white transition-all"
            title="إغلاق التنبيه"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modal Guide for iOS Safari Install */}
      {showIosGuide && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-teal-500/30 rounded-3xl p-6 max-w-md w-full space-y-5 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Share className="w-5 h-5 text-teal-400" />
                <h3 className="font-extrabold text-base font-display">تثبيت التطبيق على آيفون (iOS)</h3>
              </div>
              <button onClick={() => setShowIosGuide(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-medium text-slate-300 leading-relaxed">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/60 border border-slate-700">
                <span className="w-6 h-6 rounded-full bg-[#0f766e] text-white font-bold flex items-center justify-center shrink-0 text-xs">
                  1
                </span>
                <p>
                  من متصفح Safari، اضغط على زر <strong>المشاركة ⬆️ (Share)</strong> في أسفل الشاشة.
                </p>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/60 border border-slate-700">
                <span className="w-6 h-6 rounded-full bg-[#0f766e] text-white font-bold flex items-center justify-center shrink-0 text-xs">
                  2
                </span>
                <p>
                  اختر من القائمة <strong>"إضافة إلى الشاشة الرئيسية" (Add to Home Screen)</strong>.
                </p>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/60 border border-slate-700">
                <span className="w-6 h-6 rounded-full bg-[#0f766e] text-white font-bold flex items-center justify-center shrink-0 text-xs">
                  3
                </span>
                <p>
                  اضغط <strong>"إضافة" (Add)</strong> في أعلى الزاوية، وسينزل التطبيق فوراً على شاشة هاتفك الرئيسي!
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-3 rounded-2xl bg-[#0f766e] hover:bg-[#0f766e]/90 text-white font-extrabold text-xs shadow-lg transition-all"
            >
              فهمت، شكراً!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
