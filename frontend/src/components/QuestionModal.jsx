import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Send, X, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';

export default function QuestionModal({ doctor, student, isOpen, onClose, onSuccess }) {
  const [subject, setSubject] = useState('');
  const [questionContent, setQuestionContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !doctor || !student) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !questionContent.trim()) {
      setError('يرجى ملء كافة البيانات المطلوب إرسالها');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('studentToken');
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          studentId: student.id,
          doctorId: doctor.id,
          subject: subject.trim(),
          questionContent: questionContent.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إرسال السؤال');

      onSuccess(data.conversation);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[99999] flex items-center justify-center p-4 bg-black/75 overflow-y-auto">
      <div className="w-full max-w-xl p-6 relative surface-card border-theme rounded-2xl shadow-2xl my-auto">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-theme-muted hover:text-[#2e9b9b] p-1 rounded-lg hover:bg-[var(--surface-2)]"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-theme">
          <div className="w-10 h-10 rounded-xl bg-[#2e9b9b]/15 text-[#2e9b9b] flex items-center justify-center font-bold">
            {doctor.fullName.charAt(2)}
          </div>
          <div>
            <h2 className="text-lg font-bold text-theme-primary">إرسال سؤال إلى {doctor.fullName}</h2>
            <p className="text-xs text-[#2e9b9b] font-semibold">{doctor.department} - {doctor.specialty}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="input-label">موضوع السؤال / الاستفسار</label>
            <input
              type="text"
              required
              className="input-field"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="مثال: موعد تسليم مشروع التخرج / استفسار في محاضرة الأسبوع الثالث"
            />
          </div>

          <div>
            <label className="input-label">نص السؤال</label>
            <textarea
              required
              rows={4}
              className="input-field resize-none"
              value={questionContent}
              onChange={(e) => setQuestionContent(e.target.value)}
              placeholder="اكتب سؤالك بالتفصيل هنا..."
            ></textarea>
          </div>

          {/* Student Identity Notice Box */}
          <div className="p-3 rounded-xl border border-[#2e9b9b]/25 bg-[#2e9b9b]/8">
            <div className="font-bold text-[#2e9b9b] mb-1 flex items-center gap-1.5 text-xs">
              <Sparkles className="w-3.5 h-3.5" /> سيتم إرسال السؤال عبر المنصة بالمعلومات التالية:
            </div>
            <div className="text-[11px] text-theme-secondary space-y-0.5 dir-rtl">
              <div>• <b>اسم الطالب:</b> {student.fullName}</div>
              <div>• <b>الرقم الجامعي:</b> {student.universityId || 'غير محدد'}</div>
              <div>• <b>التخصص:</b> {student.department}</div>
              <div>• <b>رقم الدكتور:</b> <span className="text-[#2e9b9b]">محمي كلياً وغير ظاهر إطلاقاً</span></div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary text-xs">
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-whatsapp text-xs font-bold py-2.5 px-5"
            >
              {loading ? 'جاري الإرسال عبر المنصة...' : 'تواصل معه عبر المنصة'} <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
