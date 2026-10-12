import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { X, Maximize2, Minimize2, ArrowLeft } from 'lucide-react';

const openModals = new Map();
let nextModalId = 0;

const syncBodyScrollLock = () => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = openModals.size > 0 ? 'hidden' : 'unset';
  }
};

export function useExclusiveModal(isOpen, onClose) {
  const closeRef = useRef(onClose);
  const modalId = useRef(null);
  closeRef.current = onClose;

  if (modalId.current === null) {
    modalId.current = `app-modal-${++nextModalId}`;
  }

  useEffect(() => {
    if (!isOpen) return undefined;

    openModals.forEach((close, id) => {
      if (id !== modalId.current) close();
    });

    const close = () => closeRef.current();
    openModals.set(modalId.current, close);
    syncBodyScrollLock();
    window.dispatchEvent(new CustomEvent('app:modal-open', { detail: { id: modalId.current } }));

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('app:navigate', close);

    return () => {
      if (openModals.get(modalId.current) === close) {
        openModals.delete(modalId.current);
      }
      syncBodyScrollLock();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('app:navigate', close);
    };
  }, [isOpen]);
}

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
  icon: Icon,
  allowFullscreen = true,
  initialFullscreen = false,
  fullScreen = false,
}) {
  const [isFullscreen, setIsFullscreen] = useState(fullScreen || initialFullscreen);
  const { pathname } = useLocation();
  const previousPath = useRef(pathname);
  useExclusiveModal(isOpen, onClose);

  useEffect(() => {
    setIsFullscreen(fullScreen || initialFullscreen);
  }, [fullScreen, initialFullscreen, isOpen]);

  useEffect(() => {
    if (previousPath.current !== pathname) {
      previousPath.current = pathname;
      onClose();
    }
  }, [pathname, onClose]);

  if (!isOpen) return null;

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  const modalContent = (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md animate-fade-in ${
        isFullscreen ? 'p-0 w-screen h-[100dvh] overflow-hidden' : 'p-2 sm:p-5 md:p-6 overflow-hidden'
      }`}
    >
      {/* Backdrop overlay (only active when not in edge-to-edge fullscreen) */}
      {!isFullscreen && (
        <div 
          className="fixed inset-0 cursor-pointer" 
          onClick={onClose} 
        />
      )}

      {/* Modal Dialog Card */}
      <div
        className={`w-full bg-white border border-slate-200 text-slate-900 shadow-2xl relative z-10 flex flex-col ring-1 ring-black/5 transition-all duration-300 ${
          isFullscreen
            ? 'h-[100dvh] w-screen max-w-none max-h-none rounded-none p-3 sm:p-5 lg:p-6 overflow-hidden'
            : `${maxWidth} rounded-2xl md:rounded-3xl p-3 sm:p-4.5 md:p-5 max-h-[calc(100dvh-1.5rem)] sm:max-h-[94vh] overflow-hidden my-auto`
        }`}
      >
        {/* Top Accent Gradient Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 rounded-t-2xl md:rounded-t-3xl shrink-0" />

        {/* Modal Header */}
        <div className="flex items-center justify-between gap-2.5 mb-2.5 sm:mb-3 border-b border-slate-200/80 pb-2 pt-0.5 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 hover:text-slate-900 border border-slate-200 transition-all cursor-pointer shadow-xs shrink-0"
              title="Back (Esc)"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
              <span>Back</span>
            </button>

            <div className="h-4 w-px bg-slate-200 shrink-0 hidden sm:block" />

            {Icon && (
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-lg font-black text-slate-900 tracking-tight truncate">{title}</h3>
                {isFullscreen && (
                  <span className="hidden sm:inline-flex items-center text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300 shrink-0 font-mono">
                    Full Screen Mode
                  </span>
                )}
              </div>
              {subtitle && <p className="text-[11px] text-slate-500 truncate font-medium">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {allowFullscreen && (
              <button
                type="button"
                onClick={toggleFullscreen}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                  isFullscreen
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
                title={isFullscreen ? 'Exit Full Screen' : 'Expand to Full Screen'}
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="w-4 h-4 text-cyan-600" />
                    <span className="hidden sm:inline">Exit Full Screen</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-4 h-4 text-slate-500" />
                    <span className="hidden sm:inline">Full Screen</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 min-h-0 min-w-0 overflow-y-auto no-scrollbar pr-1">{children}</div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
