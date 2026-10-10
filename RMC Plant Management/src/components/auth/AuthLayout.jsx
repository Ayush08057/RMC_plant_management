import React from 'react';

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-50/60 via-slate-50 to-orange-50/40 text-slate-800 selection:bg-amber-500 selection:text-black relative overflow-x-hidden font-sans p-4 sm:p-6 py-6 sm:py-8">
      
      {/* ========================================================
          MATCHING INDUSTRIAL LIGHT BACKGROUND WITH TEXTURE & WARMTH
          Identical across Login and Registration screens
          ======================================================== */}
      {/* Real Concrete Background Texture with balanced opacity */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat opacity-20 mix-blend-multiply"
        style={{
          backgroundImage: "url('/bg-texture.jpg')",
          filter: "contrast(110%) brightness(102%)",
        }}
      />

      {/* Subtle concrete grid & dots pattern */}
      <div className="fixed inset-0 concrete-grid-bg opacity-35 pointer-events-none z-0" />
      <div className="fixed inset-0 concrete-dots-bg opacity-25 pointer-events-none z-0" />

      {/* Fresh, warm ambient lighting orbs (amber-gold and soft orange) */}
      <div className="fixed -top-32 -left-32 w-[550px] h-[550px] bg-amber-300/30 rounded-full blur-[130px] pointer-events-none z-0 animate-pulse-subtle" />
      <div className="fixed -bottom-32 -right-32 w-[550px] h-[550px] bg-orange-300/25 rounded-full blur-[130px] pointer-events-none z-0 animate-pulse-subtle" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-amber-100/40 rounded-full blur-[160px] pointer-events-none z-0" />

      {/* Main Form Container - Centered with balanced breathing room */}
      <div className="w-full max-w-md z-10 flex flex-col justify-center my-auto">
        {children}

        {/* Matching Fresh Industrial Footer */}
        <div className="w-full mt-4 pt-3 border-t border-slate-300/70 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-600 font-medium gap-1.5">
          <span>&copy; {new Date().getFullYear()} SM Concrete Tech Pvt. Ltd.</span>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>Plant OS v2.4</span>
            <span>•</span>
            <span>Cloud SCADA Gateway</span>
          </div>
        </div>
      </div>

    </div>
  );
}
