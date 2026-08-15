import React, { useState } from 'react';
import { User, Mail, IdCard, GraduationCap, ArrowLeft, X } from 'lucide-react';

export default function StudentLoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [fullName, setFullName] = useState('أحمد علي الكومي');
  const [email, setEmail] = useState('ahmed.student@it-dept.edu.eg');
  const [universityId, setUniversityId] = useState('202410882');
  const [department, setDepartment] = useState('تكنولوجيا المعلومات');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/student-quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, universityId, department })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تسجيل الدخول');

      // حفظ بيانات الطالب في LocalStorage
      localStorage.setItem('studentUser', JSON.stringify(data.user));
      onLoginSuccess(data.user);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="glass-card w-full max-w-md p-6 relative border border-emerald-500/30">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center mb-3">
            <User className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">تسجيل دخول سريع للطلاب</h2>
          <p className="text-xs text-gray-400 mt-1">أدخل بياناتك للمتابعة وإرسال الأسئلة للدكاترة</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="input-label flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-400" /> الاسم ثلاثي
            </label>
            <input
              type="text"
              required
              className="input-field"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="مثال: أحمد علي الكومي"
            />
          </div>

          <div>
            <label className="input-label flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-emerald-400" /> البريد الإلكتروني الجامعي
            </label>
            <input
              type="email"
              required
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ahmed@student.edu.eg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label flex items-center gap-1.5">
                <IdCard className="w-3.5 h-3.5 text-emerald-400" /> الرقم الجامعي
              </label>
              <input
                type="text"
                className="input-field"
                value={universityId}
                onChange={(e) => setUniversityId(e.target.value)}
                placeholder="202410882"
              />
            </div>

            <div>
              <label className="input-label flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-emerald-400" /> التخصص/القسم
              </label>
              <input
                type="text"
                className="input-field"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="تكنولوجيا المعلومات"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full mt-4 py-3 text-center justify-center font-bold"
          >
            {loading ? 'جاري الحفظ...' : 'دخول ومتابعة الأسئلة'} <ArrowLeft className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
