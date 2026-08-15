import React from 'react';

/**
 * شعار جامعة برج العرب التكنولوجية — الصورة الرسمية.
 * الملف: frontend/public/logo.png (خلفية شفافة).
 */
export default function UniversityLogo({ className = 'w-32 h-32', showText = false }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <img
        src="/logo.png"
        alt="شعار جامعة برج العرب التكنولوجية"
        className={`${className} object-contain select-none`}
        draggable="false"
      />

      {showText && (
        <div className="text-center space-y-1.5">
          <h2 className="text-2xl font-bold text-theme-primary tracking-tight font-display">
            جامعة برج العرب التكنولوجية
          </h2>
          <p className="text-[11px] font-bold text-[#2e9b9b] tracking-[0.18em]">
            BORG AL ARAB TECHNOLOGICAL UNIVERSITY
          </p>
        </div>
      )}
    </div>
  );
}
