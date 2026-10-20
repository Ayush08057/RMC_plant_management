import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { WorkforceProvider } from './context/WorkforceContext';
import { LanguageProvider } from './context/LanguageContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <WorkforceProvider>
            <LanguageProvider>
              {/* Clean Enterprise Foundation Surface */}
              <div className="relative z-10 h-screen max-h-screen w-full max-w-full overflow-hidden flex flex-col bg-slate-50 text-slate-900">
                <AppRoutes />
              </div>
            </LanguageProvider>
          </WorkforceProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
