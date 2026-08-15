import React from 'react';
import { BookOpen, Send } from 'lucide-react';

export default function DoctorCard({ doctor, onSelectDoctor }) {
  const getDepartmentColor = (dept) => {
    if (dept?.includes('برمجيات') || dept?.includes('تكنولوجيا')) return 'from-[#2e9b9b]/30 to-[#40b0b0]/10';
    if (dept?.includes('ذكاء') || dept?.includes('علوم')) return 'from-[#8cbf3f]/30 to-[#7ba83f]/10';
    return 'from-[#40b0b0]/30 to-[#2e9b9b]/10';
  };

  return (
    <div className="glass-card glass-card-interactive p-6 flex flex-col justify-between relative overflow-hidden group">
      {/* Background Subtle Gradient Overlay */}
      <div className={`absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-l ${getDepartmentColor(doctor.department)}`}></div>

      <div>
        {/* Top Doctor Avatar & Status */}
        <div className="flex items-start justify-between mb-4">
          <div className="relative shrink-0 w-14 h-14 rounded-2xl overflow-hidden border-2 border-[#2e9b9b] shadow-brand group-hover:scale-105 transition-transform">
            {doctor.avatarUrl ? (
              <img
                src={doctor.avatarUrl}
                alt={doctor.fullName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-[#2e9b9b] to-[#22696a] flex items-center justify-center text-white font-extrabold text-xl shadow-brand">
                {doctor.fullName.replace('د.', '').trim().charAt(0)}
              </div>
            )}
          </div>

          <span className="badge badge-teal text-[11px] py-1 px-2.5">
            متاح عبر المنصة
          </span>
        </div>

        {/* Doctor Name & Title */}
        <div className="mb-2">
          <h3 className="text-lg font-extrabold text-theme-primary group-hover:text-[#2e9b9b] transition-colors flex items-center gap-2 flex-wrap">
            {doctor.fullName}
            {doctor.title && (
              <span className="badge badge-amber text-[10px] py-0.5 px-2 font-bold">
                {doctor.title}
              </span>
            )}
          </h3>
          {(doctor.department || doctor.specialty) && (
            <p className="text-xs text-theme-muted mt-1 flex items-center gap-1.5 font-medium">
              <BookOpen className="w-3.5 h-3.5 text-[#2e9b9b]" />
              {[doctor.department, doctor.specialty].filter(Boolean).join(' • ')}
            </p>
          )}
        </div>

        {/* Courses Chips (if any) */}
        {doctor.courses && doctor.courses.length > 0 && (
          <div className="mb-4">
            <span className="text-[10px] text-theme-muted block mb-1.5 font-bold">المواد الأكاديمية:</span>
            <div className="flex flex-wrap gap-1">
              {doctor.courses.map((course, i) => (
                <span key={i} className="text-[10px] bg-[var(--surface-2)] px-2.5 py-1 rounded-md text-theme-secondary border border-theme font-semibold">
                  {course}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Action */}
      <div className="pt-4 border-t border-theme flex items-center justify-end">
        <button
          onClick={() => onSelectDoctor(doctor)}
          className="btn btn-primary text-xs py-2.5 px-5 font-bold group-hover:scale-105 transition-all"
        >
          طرح سؤال <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
