import React from 'react';
import { Link } from 'react-router-dom';
import { HardHat, Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center mx-auto text-orange-600 mb-4">
          <HardHat className="w-8 h-8" />
        </div>
        <div className="text-3xl font-extrabold text-slate-900 mb-2 font-mono">404</div>
        <h2 className="text-lg font-bold text-slate-800 mb-2">Plant Node Not Found</h2>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          The requested system route does not exist or has been relocated in the plant hierarchy.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white transition-colors shadow-sm cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>Return to Primary Station</span>
        </Link>
      </div>
    </div>
  );
}
