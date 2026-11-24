'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Bell,
  ChevronDown,
  FileText,
  HelpCircle,
  Lock,
  LogOut,
  Moon,
  Shield,
  Sliders,
  Sparkles,
  Sun,
  Trash2,
  User,
} from 'lucide-react';
import { useHai } from '@/components/HaiContext';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { ROMANIAN_CITIES } from '@/lib/demo-data';
import type { RomanianCity } from '@/types/hai';

export function SettingsScreen() {
  const {
    setScreen,
    user,
    updateDiscoveryPrefs,
    theme,
    toggleTheme,
    logout,
    deleteAccount,
    askConfirm,
    showToast,
    openVerificationModal,
    startOnboarding,
  } = useHai();

  const [openLegalDoc, setOpenLegalDoc] = useState<'terms' | 'privacy' | 'dsa' | null>(null);

  return (
    <div className="min-h-dvh bg-[#FAFAF9] dark:bg-[#0E0F12] text-[#18191D] dark:text-[#F5F5F4] pb-[calc(40px+env(safe-area-inset-bottom,0px))]">
      <header className="sticky top-0 z-30 bg-[#FAFAF9]/90 dark:bg-[#0E0F12]/90 backdrop-blur-md border-b border-[#E9E9EC] dark:border-[#272930]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setScreen('main')}
            className="min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center rounded-full hover:bg-[#F3F3F1] dark:hover:bg-[#22242A]"
            aria-label="Înapoi"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-base font-bold">Setări</h1>
          <div className="w-11" aria-hidden="true" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 space-y-5">
        {/* 1. Cont */}
        <section className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-sm font-bold">
            <User className="h-4 w-4 text-[#F26B82]" />
            <h2>Cont</h2>
          </div>
          <div className="text-sm space-y-1 text-[#717680] dark:text-[#9CA3AF]">
            <p className="flex items-center gap-1.5">
              <span>Nume profil:</span>
              <strong className="text-[#18191D] dark:text-[#F5F5F4]">{user.name}</strong>
              {user.verificationStatus === 'verified' && <VerifiedBadge showLabel />}
            </p>
            <p>
              E-mail: <strong className="text-[#18191D] dark:text-[#F5F5F4]">{user.email}</strong>
            </p>
            <p>Statut: Conectat prin Firebase Auth (UID verificat)</p>
          </div>
          <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#E9E9EC] dark:border-[#272930]">
            <span className="text-sm font-medium">Verificare profil</span>
            {user.verificationStatus === 'verified' ? (
              <VerifiedBadge showLabel />
            ) : user.verificationStatus === 'pending' ? (
              <span className="text-xs font-semibold text-[#F26B82]">În așteptarea reviziei</span>
            ) : (
              <button
                type="button"
                onClick={openVerificationModal}
                className="min-h-[40px] px-3.5 rounded-xl bg-[#21866F] text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <BadgeCheck className="h-4 w-4" />
                <span>Verifică acum</span>
              </button>
            )}
          </div>
          <div className="pt-2 flex items-center justify-between border-t border-[#E9E9EC] dark:border-[#272930]">
            <span className="text-sm font-medium">Tur de configurare (Onboarding)</span>
            <button
              type="button"
              onClick={startOnboarding}
              className="min-h-[40px] px-3.5 rounded-xl bg-[#F3F3F1] dark:bg-[#22242A] text-xs font-semibold"
            >
              Reia configurarea
            </button>
          </div>
          <div className="pt-2 flex items-center justify-between border-t border-[#E9E9EC] dark:border-[#272930]">
            <span className="text-sm font-medium">Aspect interfață</span>
            <button
              type="button"
              onClick={toggleTheme}
              className="min-h-[40px] px-3.5 rounded-xl bg-[#F3F3F1] dark:bg-[#22242A] text-xs font-semibold flex items-center gap-2"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span>{theme === 'dark' ? 'Mod luminos' : 'Mod întunecat'}</span>
            </button>
          </div>
        </section>

        {/* 2. Confidențialitate */}
        <section className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-sm font-bold">
            <Lock className="h-4 w-4 text-[#F26B82]" />
            <h2>Confidențialitate</h2>
          </div>

          <label className="flex items-center justify-between min-h-[44px] cursor-pointer">
            <span className="text-sm">Vizibil în descoperirea dating</span>
            <input
              type="checkbox"
              checked={user.discoveryPreferences.showMeInDiscovery}
              onChange={(e) =>
                updateDiscoveryPrefs({ showMeInDiscovery: e.target.checked })
              }
              className="h-5 w-5 accent-[#F26B82]"
            />
          </label>

          <label className="flex items-center justify-between min-h-[44px] cursor-pointer">
            <span className="text-sm">Afișează participarea mea la activități</span>
            <input
              type="checkbox"
              checked={user.discoveryPreferences.showParticipantsOnJoinedActivities}
              onChange={(e) =>
                updateDiscoveryPrefs({
                  showParticipantsOnJoinedActivities: e.target.checked,
                })
              }
              className="h-5 w-5 accent-[#F26B82]"
            />
          </label>
        </section>

        {/* 3. Preferințe Dating */}
        <section className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-sm font-bold">
            <Sliders className="h-4 w-4 text-[#F26B82]" />
            <h2>Preferințe Dating</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-[#717680] mb-1">Oraș</label>
              <select
                value={user.discoveryPreferences.city}
                onChange={(e) =>
                  updateDiscoveryPrefs({ city: e.target.value as RomanianCity | 'Toate' })
                }
                className="w-full min-h-[44px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3 text-sm"
              >
                <option value="Toate">Toată România</option>
                {ROMANIAN_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#717680] mb-1">Vârstă min (18+)</label>
              <input
                type="number"
                min={18}
                max={80}
                value={user.discoveryPreferences.minAge}
                onChange={(e) =>
                  updateDiscoveryPrefs({
                    minAge: Math.max(18, Number(e.target.value) || 18),
                  })
                }
                className="w-full min-h-[44px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs text-[#717680] mb-1">Vârstă max</label>
              <input
                type="number"
                min={18}
                max={99}
                value={user.discoveryPreferences.maxAge}
                onChange={(e) =>
                  updateDiscoveryPrefs({
                    maxAge: Math.max(
                      user.discoveryPreferences.minAge,
                      Number(e.target.value) || 35
                    ),
                  })
                }
                className="w-full min-h-[44px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3 text-sm tabular-nums"
              />
            </div>
          </div>
        </section>

        {/* 4. Notificări */}
        <section className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-sm font-bold">
            <Bell className="h-4 w-4 text-[#F26B82]" />
            <h2>Notificări</h2>
          </div>

          <label className="flex items-center justify-between min-h-[44px] cursor-pointer">
            <span className="text-sm">Match-uri noi</span>
            <input
              type="checkbox"
              checked={user.discoveryPreferences.notificationsMatches}
              onChange={(e) =>
                updateDiscoveryPrefs({ notificationsMatches: e.target.checked })
              }
              className="h-5 w-5 accent-[#F26B82]"
            />
          </label>
          <label className="flex items-center justify-between min-h-[44px] cursor-pointer">
            <span className="text-sm">Actualizări activități și planuri</span>
            <input
              type="checkbox"
              checked={user.discoveryPreferences.notificationsActivities}
              onChange={(e) =>
                updateDiscoveryPrefs({ notificationsActivities: e.target.checked })
              }
              className="h-5 w-5 accent-[#F26B82]"
            />
          </label>
        </section>

        {/* 5. Siguranță & 6. Abonament */}
        <section className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-5 space-y-4">
          <button
            type="button"
            onClick={() => setScreen('safety')}
            className="w-full min-h-[44px] flex items-center justify-between text-left"
          >
            <span className="flex items-center gap-2.5 text-sm font-bold">
              <Shield className="h-4 w-4 text-[#21866F]" />
              <span>Siguranță (Gratuit întotdeauna)</span>
            </span>
            <span className="text-xs font-semibold text-[#F26B82]">Deschide</span>
          </button>

          <div className="pt-3 border-t border-[#E9E9EC] dark:border-[#272930] space-y-2">
            <div className="flex items-center gap-2.5 text-sm font-bold">
              <Sparkles className="h-4 w-4 text-[#F26B82]" />
              <h2>Abonament (Arhitectură pregătită, fără plăți active)</h2>
            </div>
            <p className="text-xs leading-relaxed text-[#717680] dark:text-[#9CA3AF]">
              Funcțiile opționale HAI+ (filtre avansate de descoperire, vizibilitate extinsă și personalizare suplimentară) nu percep plăți în această previzualizare. Blocarea, raportarea și siguranța rămân gratuite.
            </p>
          </div>
        </section>

        {/* 7. Ajutor & 8. Documente legale */}
        <section className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-sm font-bold">
            <HelpCircle className="h-4 w-4 text-[#717680]" />
            <h2>Ajutor și documente legale</h2>
          </div>

          <button
            type="button"
            onClick={() =>
              showToast('Pentru suport în previzualizare, folosește Centrul de siguranță.')
            }
            className="w-full min-h-[44px] flex items-center justify-between text-sm text-left"
          >
            <span>Centru de ajutor</span>
            <span className="text-xs text-[#717680]">Suport comunitate</span>
          </button>

          {(
            [
              { id: 'terms', label: 'Termeni și Condiții (Draft pre-lansare)' },
              { id: 'privacy', label: 'Politică de Confidențialitate și GDPR' },
              { id: 'dsa', label: 'Transparență și moderare (EU DSA)' },
            ] as const
          ).map((doc) => (
            <div
              key={doc.id}
              className="border-t border-[#E9E9EC] dark:border-[#272930] pt-2"
            >
              <button
                type="button"
                onClick={() =>
                  setOpenLegalDoc((prev) => (prev === doc.id ? null : doc.id))
                }
                className="w-full min-h-[44px] flex items-center justify-between text-sm text-left"
              >
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#717680]" />
                  <span>{doc.label}</span>
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-[#717680] transition-transform ${
                    openLegalDoc === doc.id ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openLegalDoc === doc.id && (
                <p className="pb-2 text-xs leading-relaxed text-[#717680] dark:text-[#9CA3AF]">
                  {doc.id === 'terms' &&
                    'Utilizarea HAI. este permisă exclusiv adulților (18+). Documentul final necesită revizie juridică înainte de lansarea comercială.'}
                  {doc.id === 'privacy' &&
                    'Datele personale minime vor fi prelucrate conform GDPR cu drept de acces, rectificare, portabilitate și ștergere completă a contului.'}
                  {doc.id === 'dsa' &&
                    'Utilizatorii pot raporta conținut sau comportament neconform gratuit, iar deciziile de moderare beneficiază de audit și cale de contestare.'}
                </p>
              )}
            </div>
          ))}
        </section>

        {/* 9. Deconectare & 10. Ștergere cont */}
        <section className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-5 space-y-3">
          <button
            type="button"
            onClick={() =>
              askConfirm({
                title: 'Te deconectezi?',
                description:
                  'Vei reveni la ecranul de bun venit al aplicației HAI.',
                confirmLabel: 'Deconectează-mă',
                onConfirm: () => {
                  void logout();
                },
              })
            }
            className="w-full min-h-[48px] px-4 rounded-2xl bg-[#F3F3F1] dark:bg-[#22242A] text-sm font-semibold flex items-center justify-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span>Deconectare</span>
          </button>

          <button
            type="button"
            onClick={() =>
              askConfirm({
                title: 'Ștergi definitiv contul?',
                description:
                  'Această acțiune va șterge definitiv contul Firebase, profilul și preferințele asociate. Nu poate fi anulată.',
                confirmLabel: 'Șterge contul',
                destructive: true,
                onConfirm: () => {
                  void deleteAccount();
                },
              })
            }
            className="w-full min-h-[48px] px-4 rounded-2xl border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-sm font-semibold flex items-center justify-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            <span>Ștergere cont</span>
          </button>
        </section>
      </main>
    </div>
  );
}
