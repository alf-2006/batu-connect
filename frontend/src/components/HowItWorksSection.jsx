import React from 'react';
import { PenTool, ShieldCheck, Send, Zap, ArrowLeft } from 'lucide-react';

export default function HowItWorksSection() {
  const steps = [
    {
      number: '01',
      icon: <PenTool className="w-6 h-6 text-emerald-400" />,
      title: 'اختر الدكتور واكتب سؤالك',
      desc: 'تصفح قائمة أعضاء الهيئة التدريسية حسب التخصص، واكتب استفسارك مرفقاً ببياناتك الجامعية.'
    },
    {
      number: '02',
      icon: <ShieldCheck className="w-6 h-6 text-cyan-400" />,
      title: 'التشفير وحماية الخصوصية',
      desc: 'يتم تشفير أرقام الهواتف بـ AES-256-GCM. الطالب لا يرى رقم الدكتور، والتواصل يتم آلياً عبر المنصة.'
    },
    {
      number: '03',
      icon: <Send className="w-6 h-6 text-emerald-400" />,
      title: 'الإرسال المباشر عبر المنصة',
      desc: 'يقوم النظام بتحويل السؤال للدكتور عبر المنصة مرفقاً بالرمز المرجعي الفريد REQ-XXXX.'
    },
    {
      number: '04',
      icon: <Zap className="w-6 h-6 text-purple-400" />,
      title: 'التحديث اللحظي للردود',
      desc: 'عند قيام الدكتور بالرد عبر المنصة، يصل الرد مباشرة لشاشة الطالب فوراً عبر Socket.io.'
    }
  ];

  return (
    <section className="py-12 border-t border-b border-white/5 my-12 relative overflow-hidden">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="badge badge-emerald text-xs mb-3">
          <Zap className="w-3.5 h-3.5" /> آلية العمل السلسة
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
          كيف تعمل المنصة بين الطالب والدكتور؟
        </h2>
        <p className="text-gray-400 text-sm">
          تجربة تواصل متكاملة توفر السهولة للطالب وتتيح للدكتور التعامل من تطبيقه المفضل دون تعقيد.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((step, idx) => (
          <div key={idx} className="glass-card glass-card-interactive p-6 relative group border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-900/80 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                {step.icon}
              </div>
              <span className="text-3xl font-black text-gray-700/50 group-hover:text-emerald-500/30 transition-colors font-mono">
                {step.number}
              </span>
            </div>

            <h3 className="text-base font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">
              {step.title}
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              {step.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
