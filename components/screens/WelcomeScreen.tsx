'use client';

import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Moon, ShieldCheck, Sun } from 'lucide-react';
import { useHai } from '@/components/HaiContext';
import { HaiImage } from '@/components/HaiImage';

export function WelcomeScreen() {
  const { setScreen, setAuthMode, theme, toggleTheme } = useHai();

  return (
    <div className="min-h-dvh bg-[#FAFAF9] dark:bg-[#0E0F12] text-[#18191D] dark:text-[#F5F5F4] flex flex-col">
      {/* Compact Header */}
      <header className="w-full max-w-6xl mx-auto px-5 sm:px-8 pt-[calc(16px+env(safe-area-inset-top,0px))] pb-3 flex items-center justify-between">
        <span className="font-display text-2xl font-bold tracking-tight whitespace-nowrap">
          hai<span className="text-[#F26B82]">.</span>
        </span>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-xs text-[#717680] dark:text-[#9CA3AF]">
            Autentificare securizată Firebase
          </span>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Comută la modul luminos' : 'Comută la modul întunecat'}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full border border-[#E9E9EC] dark:border-[#272930] bg-white dark:bg-[#18191D] text-[#18191D] dark:text-[#F5F5F4] hover:bg-[#F3F3F1] dark:hover:bg-[#22242A] transition-colors"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* Main Split Editorial Layout */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-5 sm:px-8 py-4 sm:py-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-stretch pb-[calc(28px+env(safe-area-inset-bottom,0px))]">
        {/* Editorial Photography */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="lg:col-span-6 relative min-h-[340px] sm:min-h-[440px] lg:min-h-[560px] rounded-3xl overflow-hidden shadow-sm border border-[#E9E9EC] dark:border-[#272930]"
        >
          <HaiImage
            photoKey="welcome"
            alt="Tineri adulți într-o piață însorită din Cluj-Napoca la cafea"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 text-white">
            <p className="text-xs font-medium text-white/80">
              Cluj-Napoca · București · Brașov · Timișoara · Sibiu · Iași
            </p>
            <p className="mt-1 text-sm sm:text-base font-medium text-white/95">
              Cunoaște oameni. Fă planuri. Ieși din casă.
            </p>
          </div>
        </motion.div>

        {/* Copy & Actions */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="lg:col-span-6 flex flex-col justify-center lg:px-4"
        >
          <p className="text-xs font-medium text-[#717680] dark:text-[#9CA3AF]">
            Comunitate pentru adulți 18+ din România
          </p>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl font-bold tracking-tight leading-[1.08] text-balance text-[#18191D] dark:text-[#F5F5F4]">
            Viața se întâmplă afară.
          </h1>
          <p className="mt-4 text-base sm:text-lg leading-relaxed text-[#717680] dark:text-[#9CA3AF] max-w-lg">
            Descoperă oameni, activități și experiențe reale. De la un meci de padel sau o drumeție în weekend, până la o cafea cu cineva potrivit.
          </p>

          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setScreen('auth');
              }}
              className="flex items-center justify-center gap-2 min-h-[50px] px-7 rounded-2xl bg-[#F26B82] hover:bg-[#E2556E] text-white font-semibold text-base shadow-sm transition-colors"
            >
              <span>Începe</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setScreen('auth');
              }}
              className="flex items-center justify-center min-h-[50px] px-7 rounded-2xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] text-[#18191D] dark:text-[#F5F5F4] hover:bg-[#F3F3F1] dark:hover:bg-[#22242A] font-semibold text-base transition-colors"
            >
              Am deja un cont
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-[#E9E9EC] dark:border-[#272930] grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[#717680] dark:text-[#9CA3AF]">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-[#21866F] dark:text-[#34D399] shrink-0 mt-0.5" />
              <span>
                Funcții de siguranță gratuite: blocare, raportare și check-in voluntar.
              </span>
            </div>
            <div>
              <span>
                Autentificare reală prin Google / Firebase Auth și profil persistent în Cloud Firestore.
              </span>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
