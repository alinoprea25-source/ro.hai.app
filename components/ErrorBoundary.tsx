'use client';

import React from 'react';
import { RefreshCw, ShieldAlert } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'A apărut o eroare neașteptată.',
    };
  }

  componentDidCatch(error: Error) {
    console.error('ErrorBoundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      let friendlyMessage =
        'A apărut o eroare la sincronizarea datelor. Încearcă să reîmprospătezi aplicația.';
      try {
        const parsed = JSON.parse(this.state.message);
        if (parsed && parsed.operationType && parsed.path) {
          friendlyMessage = `Operațiunea ${parsed.operationType} pe ${parsed.path} nu a putut fi finalizată (${parsed.error}).`;
        }
      } catch {
        // Keep friendly Romanian fallback
      }

      return (
        <div className="min-h-dvh bg-[#FAFAF9] dark:bg-[#0E0F12] text-[#18191D] dark:text-[#F5F5F4] flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-6 text-center space-y-4 shadow-sm">
            <div className="mx-auto h-12 w-12 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h1 className="font-display text-xl font-bold">Ceva nu a mers corect</h1>
            <p className="text-xs leading-relaxed text-[#717680] dark:text-[#9CA3AF]">
              {friendlyMessage}
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                if (typeof window !== 'undefined') {
                  window.location.reload();
                }
              }}
              className="min-h-[46px] px-5 rounded-2xl bg-[#18191D] dark:bg-[#F26B82] text-white text-sm font-semibold inline-flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Reîncarcă aplicația</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
