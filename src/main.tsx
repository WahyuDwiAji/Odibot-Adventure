import React, { Component, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error?.message || 'Terjadi gangguan tak terduga.' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900 border border-slate-700 rounded-2xl p-6 text-center shadow-2xl space-y-4">
            <div className="text-4xl">🤖</div>
            <h1 className="text-lg font-bold text-white">Odibot Perlu Muat Ulang</h1>
            <p className="text-xs text-slate-400">
              Terjadi kesalahan sementara pada penyimpanan browser ({this.state.errorMessage}).
            </p>
            <button
              onClick={() => {
                try {
                  localStorage.removeItem('kodibot_progress');
                  localStorage.removeItem('odibot_autorun');
                  localStorage.removeItem('odibot_autorun_v2');
                } catch {}
                window.location.reload();
              }}
              className="w-full py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-sm transition-colors cursor-pointer"
            >
              Bersihkan Cache &amp; Muat Ulang
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
);
