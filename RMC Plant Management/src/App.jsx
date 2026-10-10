import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { WorkforceProvider } from './context/WorkforceContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <WorkforceProvider>
            {/* Global Industrial Mineral Teal & Terracotta Texture Layer for the WHOLE Website */}
            <div 
              className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700"
              style={{
                backgroundImage: "url('/bg-texture.jpg')",
                opacity: 0.15,
                filter: "contrast(115%) saturate(125%)",
              }}
            />
            {/* Ambient Dual-Tone Gradient Wash (Teal & Terracotta) */}
            <div 
              className="fixed inset-0 pointer-events-none z-0 opacity-80"
              style={{
                background: "radial-gradient(ellipse at 15% 10%, rgba(14, 116, 144, 0.08) 0%, transparent 60%), radial-gradient(ellipse at 85% 90%, rgba(234, 88, 12, 0.08) 0%, transparent 60%)"
              }}
            />
            <div className="relative z-10 min-h-screen">
              <AppRoutes />
            </div>
          </WorkforceProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
