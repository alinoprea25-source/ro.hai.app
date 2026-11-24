'use client';

import React, { useState } from 'react';
import { ArrowLeft, KeyRound, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useHai } from '@/components/HaiContext';

export function AuthScreen() {
  const { authMode, setAuthMode, setScreen, signInWithGoogle, authLoading } = useHai();

  const [isAdult, setIsAdult] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setError(null);
    if (authMode === 'register') {
      if (!isAdult) {
        setError('HAI. este destinat exclusiv adulților cu vârsta de cel puțin 18 ani.');
        return;
      }
      if (!acceptedTerms) {
        setError('Confirmă acceptarea Termenilor și a Politicii de Confidențialitate.');
        return;
      }
    }

    const res = await signInWithGoogle();
    if (!res.ok && res.error) {
      setError(res.error);
    }
  };

  return (
    <div className="min-h-dvh bg-[#FAFAF9] dark:bg-[#0E0F12] text-[#18191D] dark:text-[#F5F5F4] flex flex-col">
      <header className="w-full max-w-xl mx-auto px-5 pt-[calc(16px+env(safe-area-inset-top,0px))] pb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setScreen('welcome')}
          className="min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center rounded-full hover:bg-[#F3F3F1] dark:hover:bg-[#22242A] transition-colors"
          aria-label="Înapoi la ecranul de bun venit"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="font-display text-xl font-bold tracking-tight">
          hai<span className="text-[#F26B82]">.</span>
        </span>
        <div className="w-11" aria-hidden="true" />
      </header>

      <main className="flex-1 w-full max-w-xl mx-auto px-5 py-4 pb-[calc(32px+env(safe-area-inset-bottom,0px))]">
        <div className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-6 sm:p-8 shadow-sm">
          {/* Real Firebase Auth Status */}
          <div className="mb-6 rounded-2xl bg-[#21866F]/10 border border-[#21866F]/25 p-3.5 flex items-start gap-3">
            <ShieldCheck className="h-4 w-4 text-[#21866F] dark:text-[#34D399] shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed text-[#18191D] dark:text-[#F5F5F4]">
              <p className="font-semibold">Autentificare securizată Firebase</p>
              <p className="mt-0.5 text-[#717680] dark:text-[#9CA3AF]">
                Conectarea cu Google folosește Firebase Authentication și creează sau încarcă profilul tău persistent din Cloud Firestore.
              </p>
            </div>
          </div>

          {/* Mode Segmented Control */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#F3F3F1] dark:bg-[#22242A] mb-6">
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setError(null);
              }}
              className={`min-h-[42px] rounded-lg text-sm font-medium transition-colors ${
                authMode === 'register'
                  ? 'bg-white dark:bg-[#18191D] text-[#18191D] dark:text-white shadow-sm'
                  : 'text-[#717680] dark:text-[#9CA3AF]'
              }`}
            >
              Creează cont
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setError(null);
              }}
              className={`min-h-[42px] rounded-lg text-sm font-medium transition-colors ${
                authMode === 'login'
                  ? 'bg-white dark:bg-[#18191D] text-[#18191D] dark:text-white shadow-sm'
                  : 'text-[#717680] dark:text-[#9CA3AF]'
              }`}
            >
              Autentificare
            </button>
          </div>

          <h1 className="font-display text-2xl font-bold tracking-tight">
            {authMode === 'register' ? 'Alătură-te comunității HAI.' : 'Bine ai revenit'}
          </h1>
          <p className="mt-1 text-sm text-[#717680] dark:text-[#9CA3AF]">
            Aplicație exclusiv pentru adulți (18+) din România.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:text-red-300 flex items-center gap-2"
            >
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {authMode === 'register' && (
            <div className="mt-5 space-y-2.5">
              <label className="flex items-start gap-2.5 text-xs text-[#18191D] dark:text-[#F5F5F4] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAdult}
                  onChange={(e) => setIsAdult(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#F26B82] rounded"
                />
                <span>
                  Confirm că am cel puțin <strong>18 ani împliniți</strong> (eligibilitate exclusivă pentru adulți).
                </span>
              </label>

              <label className="flex items-start gap-2.5 text-xs text-[#717680] dark:text-[#9CA3AF] cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#F26B82] rounded"
                />
                <span>
                  Sunt de acord cu Termenii de utilizare, Regulile comunității și Politica de confidențialitate (GDPR).
                </span>
              </label>
            </div>
          )}

          <button
            type="button"
            disabled={authLoading}
            onClick={handleGoogleSignIn}
            className="mt-6 w-full min-h-[50px] flex items-center justify-center gap-2.5 rounded-2xl bg-[#F26B82] hover:bg-[#E2556E] disabled:opacity-60 text-white text-sm font-semibold shadow-sm transition-colors"
          >
            <KeyRound className="h-4 w-4" />
            <span>
              {authLoading ? 'Se deschide Google Sign-In...' : 'Continuă cu Google'}
            </span>
          </button>

          <p className="mt-4 text-xs leading-relaxed text-[#717680] dark:text-[#9CA3AF]">
            Identitatea contului tău este gestionată exclusiv prin Firebase Authentication UID; la prima autentificare vei parcurge configurarea profilului.
          </p>
        </div>
      </main>
    </div>
  );
}
