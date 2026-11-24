'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  Compass,
  Heart,
  ImagePlus,
  MessageCircle,
  ShieldAlert,
  Sparkles,
  Upload,
} from 'lucide-react';
import { useHai } from '@/components/HaiContext';
import { HaiImage } from '@/components/HaiImage';
import { ROMANIAN_CITIES } from '@/lib/demo-data';
import type { ActivityCategory, PhotoKey, RomanianCity } from '@/types/hai';

const SUGGESTED_INTERESTS = [
  'Padel',
  'Drumeții',
  'Cafea de specialitate',
  'Cinema',
  'Alergare',
  'Cultură',
  'Ciclism',
  'Gastronomie',
  'Fotografie',
  'Muzică',
  'Tenis',
  'Teatru',
];

const ACTIVITY_CATEGORIES: ActivityCategory[] = ['Sport', 'Social', 'Outdoor', 'Cultură'];

const STARTER_PORTRAITS: { key: PhotoKey; label: string }[] = [
  { key: 'andrei', label: 'Portret urban' },
  { key: 'razvan', label: 'La cafea' },
  { key: 'ioana', label: 'Lumină naturală' },
  { key: 'elena', label: 'În natură' },
];

export function OnboardingScreen() {
  const { user, completeOnboarding, skipOnboarding, showToast } = useHai();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Step 1: Basic Profile
  const [name, setName] = useState(user.name);
  const [age, setAge] = useState<number>(user.age);
  const [city, setCity] = useState<RomanianCity>(user.city);
  const [occupation, setOccupation] = useState(user.occupation);

  // Step 2: Profile Picture
  const [photoKey, setPhotoKey] = useState<PhotoKey>(user.photoKey);
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string | undefined>(user.customPhotoUrl);

  // Step 3: Interests & Bio
  const [interests, setInterests] = useState<string[]>(user.interests);
  const [customInterest, setCustomInterest] = useState('');
  const [bio, setBio] = useState(user.bio);

  // Step 4: Dating & Activity Preferences
  const [discoveryCity, setDiscoveryCity] = useState<RomanianCity | 'Toate'>(
    user.discoveryPreferences.city
  );
  const [minAge, setMinAge] = useState(user.discoveryPreferences.minAge);
  const [maxAge, setMaxAge] = useState(user.discoveryPreferences.maxAge);
  const [activityPreferences, setActivityPreferences] = useState<ActivityCategory[]>(
    user.activityPreferences
  );

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('Alege o imagine în format JPG, PNG sau WebP.', 'error');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      showToast('Fotografia nu poate depăși 3 MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCustomPhotoUrl(reader.result);
        showToast('Fotografie încărcată.', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  const toggleInterest = (item: string) => {
    setInterests((prev) => {
      if (prev.includes(item)) {
        return prev.filter((i) => i !== item);
      }
      if (prev.length >= 6) {
        showToast('Poți selecta cel mult 6 interese.');
        return prev;
      }
      return [...prev, item];
    });
  };

  const handleAddCustomInterest = () => {
    const clean = customInterest.trim();
    if (!clean) return;
    if (interests.length >= 6) {
      showToast('Ai atins limita de 6 interese.');
      return;
    }
    if (!interests.includes(clean)) {
      setInterests((prev) => [...prev, clean.slice(0, 24)]);
    }
    setCustomInterest('');
  };

  const toggleActivityPref = (cat: ActivityCategory) => {
    setActivityPreferences((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      if (name.trim().length < 2) {
        setError('Introdu un prenume de cel puțin 2 caractere.');
        return;
      }
      if (!Number.isFinite(age) || age < 18 || age > 99) {
        setError('Vârsta trebuie să fie de cel puțin 18 ani.');
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      setStep(3);
      return;
    }

    if (step === 3) {
      if (interests.length === 0) {
        setError('Selectează cel puțin un interes pentru a continua.');
        return;
      }
      if (bio.trim().length < 10) {
        setError('Scrie o scurtă biografie (minim 10 caractere).');
        return;
      }
      setStep(4);
      return;
    }

    if (step === 4) {
      if (minAge < 18 || maxAge < minAge) {
        setError('Intervalul de vârstă trebuie să fie valid (minim 18 ani).');
        return;
      }
      setStep(5);
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    setError(null);
    try {
      await completeOnboarding(
        {
          name: name.trim() || user.name,
          age: Math.max(18, Math.min(99, age)),
          city,
          occupation: occupation.trim() || user.occupation,
          photoKey,
          customPhotoUrl,
          interests: interests.length > 0 ? interests : user.interests,
          bio: bio.trim() || user.bio,
          activityPreferences:
            activityPreferences.length > 0 ? activityPreferences : ['Social'],
          discoveryPreferences: {
            ...user.discoveryPreferences,
            city: discoveryCity,
            minAge: Math.max(18, minAge),
            maxAge: Math.max(minAge, maxAge),
          },
        },
        discoveryCity
      );
    } catch {
      setError('Nu am putut salva profilul în cont. Încearcă din nou.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    setSaving(true);
    setError(null);
    try {
      await skipOnboarding();
    } catch {
      setError('Nu am putut actualiza statutul configurării. Încearcă din nou.');
    } finally {
      setSaving(false);
    }
  };

  const stepLabels = [
    '01. Profil',
    '02. Fotografie',
    '03. Interese',
    '04. Preferințe',
    '05. Tur HAI.',
  ];

  return (
    <div className="min-h-dvh bg-[#FAFAF9] dark:bg-[#0E0F12] text-[#18191D] dark:text-[#F5F5F4] flex flex-col">
      {/* Top Bar */}
      <header className="w-full max-w-2xl mx-auto px-5 pt-[calc(16px+env(safe-area-inset-top,0px))] pb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setStep((s) => (s - 1) as 1 | 2 | 3 | 4 | 5);
              }}
              aria-label="Pasul anterior"
              className="min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center rounded-full hover:bg-[#F3F3F1] dark:hover:bg-[#22242A]"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : (
            <span className="font-display text-2xl font-bold tracking-tight">
              hai<span className="text-[#F26B82]">.</span>
            </span>
          )}
        </div>

        <span className="text-xs font-medium text-[#717680] dark:text-[#9CA3AF] tabular-nums">
          Pasul {step} din 5
        </span>

        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSkip()}
          className="min-h-[44px] px-3 text-sm font-medium text-[#717680] dark:text-[#9CA3AF] hover:text-[#18191D] dark:hover:text-white transition-colors disabled:opacity-50"
        >
          Sari peste
        </button>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-5 pb-[calc(32px+env(safe-area-inset-bottom,0px))]">
        {/* Progress Indicator */}
        <div className="grid grid-cols-5 gap-1.5 mb-6">
          {stepLabels.map((label, idx) => {
            const stepNum = idx + 1;
            const active = step >= stepNum;
            return (
              <div key={label} className="space-y-1">
                <div
                  className={`h-1.5 rounded-full transition-colors ${
                    active ? 'bg-[#F26B82]' : 'bg-[#E9E9EC] dark:bg-[#272930]'
                  }`}
                />
                <span className="hidden sm:block text-[11px] font-medium text-[#717680] dark:text-[#9CA3AF] truncate">
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-6 sm:p-8 shadow-sm">
          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:text-red-300 flex items-center gap-2"
            >
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.16 }}
                className="space-y-5"
              >
                <div>
                  <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
                    Să ne cunoaștem
                  </h1>
                  <p className="mt-1 text-sm text-[#717680] dark:text-[#9CA3AF]">
                    Spune-ne câteva lucruri esențiale despre tine.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="ob-name" className="block text-xs font-medium text-[#717680] mb-1.5">
                      Prenume
                    </label>
                    <input
                      id="ob-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Vlad"
                      className="w-full min-h-[46px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F26B82]"
                    />
                  </div>

                  <div>
                    <label htmlFor="ob-age" className="block text-xs font-medium text-[#717680] mb-1.5">
                      Vârstă (18+)
                    </label>
                    <input
                      id="ob-age"
                      type="number"
                      min={18}
                      max={99}
                      value={age}
                      onChange={(e) => setAge(Number(e.target.value) || 18)}
                      className="w-full min-h-[46px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[#F26B82]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="ob-city" className="block text-xs font-medium text-[#717680] mb-1.5">
                      Oraș principal
                    </label>
                    <select
                      id="ob-city"
                      value={city}
                      onChange={(e) => {
                        const c = e.target.value as RomanianCity;
                        setCity(c);
                        setDiscoveryCity(c);
                      }}
                      className="w-full min-h-[46px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F26B82]"
                    >
                      {ROMANIAN_CITIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="ob-job" className="block text-xs font-medium text-[#717680] mb-1.5">
                      Ocupație (opțional)
                    </label>
                    <input
                      id="ob-job"
                      type="text"
                      value={occupation}
                      onChange={(e) => setOccupation(e.target.value)}
                      placeholder="Ex: Designer, Inginer..."
                      className="w-full min-h-[46px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F26B82]"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.16 }}
                className="space-y-5"
              >
                <div>
                  <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
                    Alege o fotografie de profil
                  </h1>
                  <p className="mt-1 text-sm text-[#717680] dark:text-[#9CA3AF]">
                    Fotografiile clare, naturale primesc mai multe răspunsuri și invitații la activități.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="relative h-44 w-36 rounded-3xl overflow-hidden border border-[#E9E9EC] dark:border-[#272930] bg-[#F3F3F1] dark:bg-[#22242A] shrink-0">
                    <HaiImage
                      photoKey={photoKey}
                      customUrl={customPhotoUrl}
                      alt="Previzualizare fotografie de profil"
                      fill
                      sizes="144px"
                    />
                  </div>

                  <div className="flex-1 w-full space-y-3">
                    <label className="w-full min-h-[48px] px-4 rounded-2xl bg-[#18191D] dark:bg-white text-white dark:text-[#18191D] text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer hover:opacity-90 transition-opacity">
                      <Upload className="h-4 w-4" />
                      <span>Încarcă fotografie (JPG / PNG / WebP)</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handlePhotoUpload}
                        className="sr-only"
                      />
                    </label>

                    <p className="text-xs text-[#717680] dark:text-[#9CA3AF]">
                      {customPhotoUrl?.startsWith('data:')
                        ? 'Fotografia încărcată este afișată local în această sesiune; sincronizarea media va fi activată odată cu Cloud Storage.'
                        : 'Sau alege un portret de pornire:'}
                    </p>

                    <div className="grid grid-cols-4 gap-2">
                      {STARTER_PORTRAITS.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => {
                            setCustomPhotoUrl(undefined);
                            setPhotoKey(item.key);
                          }}
                          className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                            !customPhotoUrl && photoKey === item.key
                              ? 'border-[#F26B82]'
                              : 'border-transparent opacity-75 hover:opacity-100'
                          }`}
                          aria-label={item.label}
                        >
                          <HaiImage photoKey={item.key} alt={item.label} fill sizes="80px" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.16 }}
                className="space-y-5"
              >
                <div>
                  <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
                    Interese și biografie
                  </h1>
                  <p className="mt-1 text-sm text-[#717680] dark:text-[#9CA3AF]">
                    Selectează până la 6 interese și scrie câteva rânduri autentice.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-[#717680]">
                      Interese ({interests.length}/6)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED_INTERESTS.map((item) => {
                      const active = interests.includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggleInterest(item)}
                          className={`min-h-[40px] px-3.5 rounded-xl text-xs font-medium border transition-colors ${
                            active
                              ? 'bg-[#18191D] text-white border-[#18191D] dark:bg-[#F26B82] dark:border-[#F26B82]'
                              : 'bg-[#FAFAF9] dark:bg-[#0E0F12] border-[#E9E9EC] dark:border-[#272930]'
                          }`}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={customInterest}
                      onChange={(e) => setCustomInterest(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomInterest();
                        }
                      }}
                      placeholder="Adaugă alt interes (ex: Escaladă)"
                      className="flex-1 min-h-[42px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3 text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomInterest}
                      className="min-h-[42px] px-4 rounded-xl bg-[#F3F3F1] dark:bg-[#22242A] text-xs font-semibold"
                    >
                      Adaugă
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="ob-bio" className="text-xs font-medium text-[#717680]">
                      Biografie scurtă
                    </label>
                    <span className="text-xs text-[#717680] tabular-nums">
                      {bio.length}/240
                    </span>
                  </div>
                  <textarea
                    id="ob-bio"
                    rows={3}
                    maxLength={240}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Ce îți place să faci într-un weekend liber?"
                    className="w-full rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F26B82]"
                  />
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.16 }}
                className="space-y-5"
              >
                <div>
                  <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
                    Preferințe inițiale
                  </h1>
                  <p className="mt-1 text-sm text-[#717680] dark:text-[#9CA3AF]">
                    Personalizează descoperirea de persoane și tipurile de activități.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#717680] mb-1.5">
                    Oraș pentru descoperire
                  </label>
                  <select
                    value={discoveryCity}
                    onChange={(e) =>
                      setDiscoveryCity(e.target.value as RomanianCity | 'Toate')
                    }
                    className="w-full min-h-[46px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3.5 text-sm"
                  >
                    <option value="Toate">Toată România</option>
                    {ROMANIAN_CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#717680] mb-1.5">
                      Vârstă minimă (18+)
                    </label>
                    <input
                      type="number"
                      min={18}
                      max={80}
                      value={minAge}
                      onChange={(e) => setMinAge(Math.max(18, Number(e.target.value) || 18))}
                      className="w-full min-h-[46px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3.5 text-sm tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#717680] mb-1.5">
                      Vârstă maximă
                    </label>
                    <input
                      type="number"
                      min={minAge}
                      max={99}
                      value={maxAge}
                      onChange={(e) =>
                        setMaxAge(Math.max(minAge, Number(e.target.value) || 35))
                      }
                      className="w-full min-h-[46px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3.5 text-sm tabular-nums"
                    />
                  </div>
                </div>

                <div>
                  <span className="block text-xs font-medium text-[#717680] mb-2">
                    Activități care te atrag
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {ACTIVITY_CATEGORIES.map((cat) => {
                      const active = activityPreferences.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleActivityPref(cat)}
                          className={`min-h-[44px] rounded-xl text-sm font-medium border transition-colors ${
                            active
                              ? 'bg-[#18191D] text-white border-[#18191D] dark:bg-white dark:text-[#18191D]'
                              : 'bg-[#FAFAF9] dark:bg-[#0E0F12] border-[#E9E9EC] dark:border-[#272930]'
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div
                key="step-5"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.16 }}
                className="space-y-5"
              >
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#F26B82]">
                    <Sparkles className="h-4 w-4" />
                    <span>Ești pregătit(ă)</span>
                  </div>
                  <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight">
                    Cum funcționează HAI.
                  </h1>
                  <p className="mt-1 text-sm text-[#717680] dark:text-[#9CA3AF]">
                    Tot ce ai nevoie este organizat în bara plutitoare de jos.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-4 rounded-2xl bg-[#FAFAF9] dark:bg-[#0E0F12] border border-[#E9E9EC] dark:border-[#272930] space-y-1.5">
                    <Heart className="h-5 w-5 text-[#F26B82]" />
                    <h2 className="font-display text-sm font-bold">Dating (Acasă)</h2>
                    <p className="text-xs leading-relaxed text-[#717680] dark:text-[#9CA3AF]">
                      Descoperă oameni compatibili din orașul tău prin swipe sau butoane dedicate și creează match-uri reciproce.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FAFAF9] dark:bg-[#0E0F12] border border-[#E9E9EC] dark:border-[#272930] space-y-1.5">
                    <Compass className="h-5 w-5 text-[#21866F] dark:text-[#34D399]" />
                    <h2 className="font-display text-sm font-bold">Activități reale</h2>
                    <p className="text-xs leading-relaxed text-[#717680] dark:text-[#9CA3AF]">
                      Alătură-te la padel, drumeții, cafea sau cinema ori propune propria activitate din tab-ul Creează.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FAFAF9] dark:bg-[#0E0F12] border border-[#E9E9EC] dark:border-[#272930] space-y-1.5">
                    <Calendar className="h-5 w-5 text-[#F26B82]" />
                    <h2 className="font-display text-sm font-bold">Planurile mele</h2>
                    <p className="text-xs leading-relaxed text-[#717680] dark:text-[#9CA3AF]">
                      Urmărește întâlnirile confirmate, activează check-in-ul de siguranță și partajează planuri voluntar.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FAFAF9] dark:bg-[#0E0F12] border border-[#E9E9EC] dark:border-[#272930] space-y-1.5">
                    <MessageCircle className="h-5 w-5 text-[#18191D] dark:text-white" />
                    <h2 className="font-display text-sm font-bold">Mesaje și siguranță</h2>
                    <p className="text-xs leading-relaxed text-[#717680] dark:text-[#9CA3AF]">
                      Propune întâlniri direct din conversații și verifică-ți profilul din Profil pentru încredere sporită.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer Action */}
          <div className="mt-7 pt-5 border-t border-[#E9E9EC] dark:border-[#272930] flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSkip()}
              className="min-h-[46px] px-4 rounded-2xl text-sm font-medium text-[#717680] hover:text-[#18191D] dark:hover:text-white transition-colors disabled:opacity-50"
            >
              Sari peste configurare
            </button>

            {step < 5 ? (
              <button
                type="button"
                onClick={handleNext}
                className="min-h-[48px] px-6 rounded-2xl bg-[#F26B82] hover:bg-[#E2556E] text-white text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                <span>Continuă</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleFinish()}
                className="min-h-[48px] px-6 rounded-2xl bg-[#18191D] dark:bg-[#F26B82] hover:opacity-95 disabled:opacity-60 text-white text-sm font-semibold flex items-center gap-2 transition-opacity"
              >
                <Check className="h-4 w-4" />
                <span>{saving ? 'Se salvează...' : 'Intră în HAI.'}</span>
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
