import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = [
    {
      q: 'هل يظهر رقم الهاتف الخاص بالدكتور للطالب في أي مرحلة؟',
      a: 'لا، على الإطلاق. أرقام هواتف الدكاترة يتم تشفيرها بخوارزمية AES-256-GCM فور إدخالها من الأدمن، ولا ترجع الأرقام أبداً في أي استجابة API للفرونت إند الخاص بالطلاب.'
    },
    {
      q: 'كيف يتعامل الدكتور مع أسئلة الطلاب الواصلة إليه؟',
      a: 'يستقبل الدكتور الرسالة من خلال المنصة الرسمية للقسم، وببساطة يقوم بالرد المباشر لترجع الإجابة تلقائياً إلى شاشة الطالب.'
    },
    {
      q: 'كيف يضمن النظام ربط رد الدكتور بالمحادثة الصحيحة؟',
      a: 'يعتمد الخادم على خوارزمية ربط ثلاثية: تبدأ بالمطابقة المباشرة عبر معرف الرسالة، ثم تحليل الكود المرجعي REQ-XXXX، وأخيراً ربط أحدث محادثة مفتوحة.'
    },
    {
      q: 'هل يتلقى الطالب الرد فور قيام الدكتور بالرد دون الحاجة لتحديث الصفحة؟',
      a: 'نعم، المنصة مدمجة بقناة Socket.io حية، وعند وصول الرد لخادم الـ Webhook يتم بث التحديث لحظياً لتبدو كأنها محادثة حية تماماً.'
    }
  ];

  return (
    <section className="py-8 max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <span className="badge badge-purple text-xs mb-2">
          <HelpCircle className="w-3.5 h-3.5" /> الأسئلة الشائعة
        </span>
        <h2 className="text-xl sm:text-2xl font-extrabold text-white">
          إجابات عن أكثر الاستفسارات التكنولوجية تكراراً
        </h2>
      </div>

      <div className="space-y-3">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="glass-card overflow-hidden border border-white/10 transition-all"
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full p-4 text-right flex items-center justify-between font-bold text-sm text-white hover:text-emerald-400 transition-colors"
              >
                <span>{faq.q}</span>
                {isOpen ? <ChevronUp className="w-4 h-4 text-emerald-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {isOpen && (
                <div className="px-4 pb-4 text-xs text-gray-300 leading-relaxed border-t border-white/5 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
