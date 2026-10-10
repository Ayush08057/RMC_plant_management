import React from 'react';
import { Check, X, ShieldAlert, ShieldCheck } from 'lucide-react';

export const getPasswordStrength = (password = '') => {
  const criteria = {
    length: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };

  const score = Object.values(criteria).filter(Boolean).length;

  let label = 'Weak';
  let color = 'bg-red-500';
  let textColor = 'text-red-400';

  if (score <= 2) {
    label = 'Weak';
    color = 'bg-red-500';
    textColor = 'text-red-400';
  } else if (score === 3) {
    label = 'Fair';
    color = 'bg-amber-500';
    textColor = 'text-amber-400';
  } else if (score === 4) {
    label = 'Good';
    color = 'bg-blue-500';
    textColor = 'text-blue-400';
  } else if (score === 5) {
    label = 'Strong';
    color = 'bg-emerald-500';
    textColor = 'text-emerald-400';
  }

  return { criteria, score, label, color, textColor, isAcceptable: score >= 3 };
};

export default function PasswordStrengthMeter({ password = '', showChecklist = true }) {
  if (!password) return null;

  const { criteria, score, label, color, textColor } = getPasswordStrength(password);

  return (
    <div className="mt-2 space-y-2 text-xs">
      {/* Progress Bars */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex flex-1 gap-1">
          {[1, 2, 3, 4, 5].map((lvl) => (
            <div
              key={lvl}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                lvl <= score ? color : 'bg-slate-700/60'
              }`}
            />
          ))}
        </div>
        <span className={`text-[11px] font-semibold tracking-wide ml-2 ${textColor}`}>
          {label}
        </span>
      </div>

      {/* Industrial Requirements Checklist */}
      {showChecklist && (
        <div className="grid grid-cols-2 gap-1.5 pt-1.5 text-slate-400">
          <div className="flex items-center gap-1.5">
            {criteria.length ? (
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )}
            <span className={criteria.length ? 'text-slate-300' : 'text-slate-500'}>
              8+ characters
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {criteria.hasUpper ? (
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )}
            <span className={criteria.hasUpper ? 'text-slate-300' : 'text-slate-500'}>
              Uppercase letter
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {criteria.hasNumber ? (
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )}
            <span className={criteria.hasNumber ? 'text-slate-300' : 'text-slate-500'}>
              At least 1 number
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {criteria.hasSpecial ? (
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )}
            <span className={criteria.hasSpecial ? 'text-slate-300' : 'text-slate-500'}>
              Special symbol (#, @, $)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
