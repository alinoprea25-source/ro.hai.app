'use client';

import React from 'react';
import {
  Compass,
  Home,
  MessageCircle,
  Moon,
  Plus,
  Shield,
  Sun,
  User,
} from 'lucide-react';
import { useHai } from '@/components/HaiContext';
import type { MainTab } from '@/types/hai';

const NAV_ITEMS: {
  id: MainTab;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}[] = [
  { id: 'home', label: 'Acasă', icon: Home },
  { id: 'activities', label: 'Activități', icon: Compass },
  { id: 'create', label: 'Creează', icon: Plus },
  { id: 'messages', label: 'Mesaje', icon: MessageCircle },
  { id: 'profile', label: 'Profil', icon: User },
];

export function FloatingNav() {
  const {
    activeTab,
    navigateTab,
    unreadTotal,
    theme,
    toggleTheme,
    selectedCity,
    setScreen,
  } = useHai();

  return (
    <>
      {/* Mobile & Tablet Floating Bottom Pill Navigation */}
      <nav
        aria-label="Navigare principală"
        className="lg:hidden fixed inset-x-0 bottom-0 z-40 flex justify-center pointer-events-none px-4 pb-[calc(12px+env(safe-area-inset-bottom,0px))]"
      >
        <div className="pointer-events-auto flex items-center justify-between gap-1 bg-[#18191D]/92 dark:bg-[#1E2026]/94 backdrop-blur-md text-white rounded-full px-2 py-1.5 shadow-[0_14px_34px_rgba(24,25,29,0.28)] border border-white/10 w-full max-w-[390px]">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isCreate = item.id === 'create';

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateTab(item.id)}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex flex-col items-center justify-center min-h-[46px] flex-1 rounded-full px-1.5 py-1 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F26B82] ${
                  isCreate
                    ? isActive
                      ? 'bg-[#F26B82] text-white shadow-sm'
                      : 'text-white hover:bg-white/10'
                    : isActive
                    ? 'bg-white/14 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/8'
                }`}
              >
                <span
                  className={`flex items-center justify-center ${
                    isCreate && !isActive
                      ? 'h-7 w-7 rounded-full bg-[#F26B82] text-white'
                      : 'h-5 w-5'
                  }`}
                >
                  <Icon className="h-[19px] w-[19px]" strokeWidth={isActive ? 2.1 : 1.75} />
                </span>
                <span className="mt-0.5 text-[10px] font-medium leading-none tracking-tight whitespace-nowrap">
                  {item.label}
                </span>

                {item.id === 'messages' && unreadTotal > 0 && (
                  <span
                    aria-label={`${unreadTotal} mesaje necitite`}
                    className="absolute top-1 right-3 min-w-[16px] h-4 px-1 rounded-full bg-[#F26B82] text-white text-[10px] font-semibold tabular-nums flex items-center justify-center"
                  >
                    {unreadTotal}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Desktop Adapted Floating Navigation Rail */}
      <aside
        aria-label="Navigare desktop"
        className="hidden lg:flex fixed left-6 top-6 bottom-6 z-40 w-[240px] flex-col justify-between rounded-3xl bg-[#18191D] text-white p-5 shadow-[0_20px_50px_rgba(24,25,29,0.18)] border border-white/10"
      >
        <div>
          <div className="flex items-center justify-between px-2 pt-1 pb-6 border-b border-white/10">
            <button
              type="button"
              onClick={() => navigateTab('home')}
              className="font-display text-2xl font-bold tracking-tight text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F26B82] rounded-lg"
            >
              hai<span className="text-[#F26B82]">.</span>
            </button>
            <span className="text-xs text-white/60 whitespace-nowrap">
              {selectedCity === 'Toate' ? 'România' : selectedCity}
            </span>
          </div>

          <div className="mt-5 flex flex-col gap-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const isCreate = item.id === 'create';

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center justify-between w-full min-h-[46px] px-3.5 rounded-2xl text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F26B82] ${
                    isCreate
                      ? isActive
                        ? 'bg-[#F26B82] text-white'
                        : 'bg-[#F26B82]/16 text-[#F26B82] hover:bg-[#F26B82] hover:text-white'
                      : isActive
                      ? 'bg-white/14 text-white'
                      : 'text-white/72 hover:text-white hover:bg-white/8'
                  }`}
                >
                  <span className="flex items-center gap-3 whitespace-nowrap">
                    <Icon className="h-[19px] w-[19px]" strokeWidth={1.85} />
                    <span>{item.label}</span>
                  </span>

                  {item.id === 'messages' && unreadTotal > 0 && (
                    <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#F26B82] text-white text-[11px] font-semibold tabular-nums flex items-center justify-center">
                      {unreadTotal}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={() => setScreen('safety')}
            className="flex items-center gap-3 w-full min-h-[44px] px-3.5 rounded-2xl text-sm text-white/75 hover:text-white hover:bg-white/8 transition-colors"
          >
            <Shield className="h-[18px] w-[18px] text-[#34D399]" strokeWidth={1.85} />
            <span className="whitespace-nowrap">Centru de siguranță</span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center justify-between w-full min-h-[44px] px-3.5 rounded-2xl text-sm text-white/75 hover:text-white hover:bg-white/8 transition-colors"
          >
            <span className="flex items-center gap-3 whitespace-nowrap">
              {theme === 'dark' ? (
                <Sun className="h-[18px] w-[18px]" strokeWidth={1.85} />
              ) : (
                <Moon className="h-[18px] w-[18px]" strokeWidth={1.85} />
              )}
              <span>{theme === 'dark' ? 'Mod luminos' : 'Mod întunecat'}</span>
            </span>
          </button>

          <p className="px-3.5 pt-2 text-[11px] leading-snug text-white/45">
            Mod demonstrativ — date fictive
          </p>
        </div>
      </aside>
    </>
  );
}
