'use client';

import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ImagePlus, ShieldAlert } from 'lucide-react';
import { useHai } from '@/components/HaiContext';
import { HaiImage } from '@/components/HaiImage';
import { ROMANIAN_CITIES } from '@/lib/demo-data';
import type { ActivityCategory, PhotoKey, RomanianCity } from '@/types/hai';

const CATEGORY_OPTIONS: ActivityCategory[] = ['Sport', 'Social', 'Outdoor', 'Cultură'];

const COVER_CHOICES: { key: PhotoKey; label: string }[] = [
  { key: 'padel', label: 'Sport & Padel' },
  { key: 'hiking', label: 'Outdoor & Natură' },
  { key: 'coffee', label: 'Cafea & Social' },
  { key: 'cinema', label: 'Cultură & Cinema' },
];

export function CreateActivityScreen() {
  const { createActivity, user, navigateTab, showToast } = useHai();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [category, setCategory] = useState<ActivityCategory>('Sport');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photoKey, setPhotoKey] = useState<PhotoKey>('padel');
  const [customImageUrl, setCustomImageUrl] = useState<string | undefined>(undefined);

  const [isoDate, setIsoDate] = useState('2026-12-07');
  const [time, setTime] = useState('18:30');
  const [city, setCity] = useState<RomanianCity>(user.city);
  const [location, setLocation] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(6);
  const [priceInput, setPriceInput] = useState('');
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [autoReleaseWaitlistSpot, setAutoReleaseWaitlistSpot] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const formatRomanianDateLabel = (iso: string) => {
    try {
      const parsed = new Date(`${iso}T12:00:00`);
      return parsed.toLocaleDateString('ro-RO', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
    } catch {
      return iso;
    }
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('Selectează o imagine JPG, PNG sau WebP.', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('Imaginea trebuie să aibă cel mult 2 MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCustomImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const validateStep1 = () => {
    if (title.trim().length < 4) {
      setError('Titlul trebuie să aibă cel puțin 4 caractere.');
      return false;
    }
    if (description.trim().length < 15) {
      setError('Descrierea trebuie să aibă cel puțin 15 caractere.');
      return false;
    }
    setError(null);
    return true;
  };

  const validateStep2 = () => {
    if (!isoDate) {
      setError('Selectează data activității.');
      return false;
    }
    if (!time) {
      setError('Selectează ora de începere.');
      return false;
    }
    if (location.trim().length < 4) {
      setError('Specifică zona sau punctul public de întâlnire.');
      return false;
    }
    if (maxParticipants < 2 || maxParticipants > 30) {
      setError('Numărul de participanți trebuie să fie între 2 și 30.');
      return false;
    }
    if (priceInput !== '' && (Number(priceInput) < 0 || Number(priceInput) > 2000)) {
      setError('Costul estimat trebuie să fie între 0 și 2000 lei.');
      return false;
    }
    setError(null);
    return true;
  };

  const handlePublish = async () => {
    setSubmitting(true);
    setError(null);
    const result = await createActivity({
      title: title.trim(),
      category,
      description: description.trim(),
      isoDate,
      dateLabel: formatRomanianDateLabel(isoDate),
      time,
      city,
      location: location.trim(),
      maxParticipants,
      priceLei: priceInput === '' ? null : Number(priceInput),
      requiresApproval,
      autoReleaseWaitlistSpot,
      photoKey,
      customImageUrl,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error || 'Nu am putut publica activitatea.');
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <header className="pb-5">
        <p className="text-xs text-[#717680] dark:text-[#9CA3AF]">
          Mod demonstrativ — activitate locală validată pe server
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
          Creează o activitate
        </h1>
        <p className="mt-1 text-sm text-[#717680] dark:text-[#9CA3AF]">
          Propune o ieșire reală în orașul tău în 3 pași simpli.
        </p>

        {/* Step Progress */}
        <div className="mt-5 grid grid-cols-3 gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="space-y-1.5">
              <div
                className={`h-1.5 rounded-full transition-colors ${
                  step >= s ? 'bg-[#F26B82]' : 'bg-[#E9E9EC] dark:bg-[#272930]'
                }`}
              />
              <p className="text-[11px] font-medium text-[#717680] dark:text-[#9CA3AF] tabular-nums">
                {s === 1 ? '01. Idee' : s === 2 ? '02. Detalii' : '03. Confirmare'}
              </p>
            </div>
          ))}
        </div>
      </header>

      <div className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-5 sm:p-7 space-y-5">
        {error && (
          <div
            role="alert"
            className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:text-red-300 flex items-center gap-2"
          >
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-[#717680] dark:text-[#9CA3AF] mb-2">
                Categorie
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CATEGORY_OPTIONS.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`min-h-[44px] rounded-xl text-sm font-medium border transition-colors ${
                      category === cat
                        ? 'bg-[#18191D] text-white border-[#18191D] dark:bg-white dark:text-[#18191D]'
                        : 'bg-[#FAFAF9] dark:bg-[#0E0F12] border-[#E9E9EC] dark:border-[#272930]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="act-title" className="block text-xs font-medium text-[#717680] mb-1.5">
                Titlul activității
              </label>
              <input
                id="act-title"
                type="text"
                maxLength={80}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Padel în Gheorgheni sau Plimbare pe Cetățuie"
                className="w-full min-h-[46px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F26B82]"
              />
            </div>

            <div>
              <label htmlFor="act-desc" className="block text-xs font-medium text-[#717680] mb-1.5">
                Descriere
              </label>
              <textarea
                id="act-desc"
                rows={4}
                maxLength={600}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Spune ce veți face, nivelul recomandat și punctul general de întâlnire..."
                className="w-full rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F26B82]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[#717680]">Imagine de copertă</span>
                <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#F26B82] cursor-pointer">
                  <ImagePlus className="h-3.5 w-3.5" />
                  <span>Încarcă fotografie proprie</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageFile}
                    className="sr-only"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {COVER_CHOICES.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => {
                      setCustomImageUrl(undefined);
                      setPhotoKey(c.key);
                    }}
                    className={`relative aspect-[4/3] rounded-2xl overflow-hidden border-2 transition-all ${
                      !customImageUrl && photoKey === c.key
                        ? 'border-[#F26B82]'
                        : 'border-transparent opacity-80 hover:opacity-100'
                    }`}
                  >
                    <HaiImage photoKey={c.key} alt={c.label} fill sizes="160px" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <span className="absolute bottom-2 left-2 right-2 text-left text-[11px] font-medium text-white">
                      {c.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => navigateTab('activities')}
                className="min-h-[46px] px-4 rounded-2xl bg-[#F3F3F1] dark:bg-[#22242A] text-sm font-medium"
              >
                Anulează
              </button>
              <button
                type="button"
                onClick={() => {
                  if (validateStep1()) setStep(2);
                }}
                className="min-h-[46px] px-6 rounded-2xl bg-[#F26B82] hover:bg-[#E2556E] text-white text-sm font-semibold flex items-center gap-2"
              >
                <span>Pasul următor</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#717680] mb-1.5">Data</label>
                <input
                  type="date"
                  value={isoDate}
                  onChange={(e) => setIsoDate(e.target.value)}
                  className="w-full min-h-[46px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3.5 text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#717680] mb-1.5">Ora</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full min-h-[46px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3.5 text-sm tabular-nums"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#717680] mb-1.5">Oraș</label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value as RomanianCity)}
                  className="w-full min-h-[46px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3.5 text-sm"
                >
                  {ROMANIAN_CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#717680] mb-1.5">
                  Zonă / Loc public
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ex: Parcul Central · Intrarea principală"
                  className="w-full min-h-[46px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3.5 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#717680] mb-1.5">
                  Număr maxim de participanți (2–30)
                </label>
                <input
                  type="number"
                  min={2}
                  max={30}
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(Number(e.target.value) || 2)}
                  className="w-full min-h-[46px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3.5 text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#717680] mb-1.5">
                  Cost estimat (lei, opțional)
                </label>
                <input
                  type="number"
                  min={0}
                  max={2000}
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  placeholder="Gratuit dacă rămâne gol"
                  className="w-full min-h-[46px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3.5 text-sm tabular-nums"
                />
              </div>
            </div>

            <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-[#E9E9EC] dark:border-[#272930] cursor-pointer">
              <input
                type="checkbox"
                checked={requiresApproval}
                onChange={(e) => setRequiresApproval(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#F26B82]"
              />
              <div className="text-sm">
                <p className="font-medium">Necesită aprobarea organizatorului</p>
                <p className="text-xs text-[#717680] dark:text-[#9CA3AF]">
                  Dacă este bifat, vei confirma manual fiecare participant înainte de alocarea locului.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-[#E9E9EC] dark:border-[#272930] cursor-pointer">
              <input
                type="checkbox"
                checked={autoReleaseWaitlistSpot}
                onChange={(e) => setAutoReleaseWaitlistSpot(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#21866F]"
              />
              <div className="text-sm">
                <p className="font-medium">
                  Eliberează locurile nereconfirmate către lista de așteptare
                </p>
                <p className="text-xs text-[#717680] dark:text-[#9CA3AF]">
                  Politica este afișată transparent dinainte participanților; dacă cineva nu reconfirmă până la termenul limită, locul trece la următorul doritor.
                </p>
              </div>
            </label>

            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="min-h-[46px] px-4 rounded-2xl bg-[#F3F3F1] dark:bg-[#22242A] text-sm font-medium flex items-center gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Înapoi</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (validateStep2()) setStep(3);
                }}
                className="min-h-[46px] px-6 rounded-2xl bg-[#F26B82] hover:bg-[#E2556E] text-white text-sm font-semibold flex items-center gap-2"
              >
                <span>Verifică</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="relative aspect-[16/9] rounded-2xl overflow-hidden border border-[#E9E9EC] dark:border-[#272930]">
              <HaiImage
                photoKey={photoKey}
                customUrl={customImageUrl}
                alt={title}
                fill
                sizes="(max-width: 768px) 100vw, 640px"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs text-[#717680] dark:text-[#9CA3AF] tabular-nums">
                {category} · {formatRomanianDateLabel(isoDate)} · {time} · {city}
              </p>
              <h2 className="font-display text-2xl font-bold">{title}</h2>
              <p className="text-sm text-[#717680] dark:text-[#9CA3AF] leading-relaxed">
                {description}
              </p>
            </div>

            <div className="pt-3 border-t border-[#E9E9EC] dark:border-[#272930] grid grid-cols-2 gap-3 text-sm tabular-nums">
              <div>
                <span className="text-xs text-[#717680] block">Locație</span>
                <span className="font-medium">{location}</span>
              </div>
              <div>
                <span className="text-xs text-[#717680] block">Locuri & Cost</span>
                <span className="font-medium">
                  Max {maxParticipants} persoane · {priceInput ? `${priceInput} lei` : 'Gratuit'}
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="min-h-[46px] px-4 rounded-2xl bg-[#F3F3F1] dark:bg-[#22242A] text-sm font-medium flex items-center gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Editează</span>
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handlePublish}
                className="min-h-[48px] px-6 rounded-2xl bg-[#F26B82] hover:bg-[#E2556E] text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60"
              >
                <Check className="h-4 w-4" />
                <span>{submitting ? 'Se publică...' : 'Publică activitatea'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
