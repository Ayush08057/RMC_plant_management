import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export default function StatusBadge({ status, text, size = 'sm' }) {
  const { t } = useLanguage();
  const rawText = text || status || '';
  const norm = rawText.toString().toLowerCase();

  let styles = 'bg-[#F5F9FF] text-[#1D5FA7] border-[#D4E4F7]';
  let dotColor = 'bg-[#1D5FA7]';

  if (
    norm.includes('pass') ||
    norm.includes('success') ||
    norm.includes('complete') ||
    norm.includes('approved') ||
    norm.includes('active') ||
    norm.includes('online') ||
    norm.includes('paid') ||
    norm.includes('optimal') ||
    norm.includes('delivered') ||
    norm.includes('healthy') ||
    norm.includes('on duty') ||
    norm.includes('ok')
  ) {
    styles = 'bg-[#EAF3FF] text-[#123B6D] border-[#246BCE] font-semibold';
    dotColor = 'bg-[#246BCE]';
  } else if (
    norm.includes('pend') ||
    norm.includes('load') ||
    norm.includes('route') ||
    norm.includes('good') ||
    norm.includes('warn') ||
    norm.includes('assigned')
  ) {
    styles = 'bg-white text-[#1D5FA7] border-[#D4E4F7] font-medium';
    dotColor = 'bg-[#1D5FA7]';
  } else if (
    norm.includes('fail') ||
    norm.includes('overdue') ||
    norm.includes('delay') ||
    norm.includes('maint') ||
    norm.includes('reject') ||
    norm.includes('cancel') ||
    norm.includes('suspend') ||
    norm.includes('deactivate')
  ) {
    styles = 'bg-[#123B6D] text-white border-[#123B6D] font-semibold';
    dotColor = 'bg-white';
  } else if (
    norm.includes('dispatch') ||
    norm.includes('arrive') ||
    norm.includes('standby') ||
    norm.includes('unload') ||
    norm.includes('info')
  ) {
    styles = 'bg-[#F5F9FF] text-[#123B6D] border-[#D4E4F7] font-medium';
    dotColor = 'bg-[#1D5FA7]';
  } else if (norm.includes('admin') || norm.includes('master') || norm.includes('enforce')) {
    styles = 'bg-[#1D5FA7] text-white border-[#1D5FA7] font-semibold';
    dotColor = 'bg-[#EAF3FF]';
  }

  const sizeClasses = size === 'xs'
    ? 'text-[10px] px-2 py-0.5'
    : size === 'lg'
      ? 'text-xs px-3.5 py-1 font-bold'
      : 'text-[11px] px-2.5 py-0.5 font-bold';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border shadow-2xs ${sizeClasses} ${styles}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0 animate-pulse`} />
      <span className="capitalize whitespace-nowrap">{t(rawText)}</span>
    </span>
  );
}
