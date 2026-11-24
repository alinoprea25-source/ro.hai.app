'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'motion/react';
import {
  Bell,
  Briefcase,
  CheckCheck,
  ChevronDown,
  Eye,
  Flag,
  Heart,
  MapPin,
  RotateCcw,
  ShieldBan,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import { useHai } from '@/components/HaiContext';
import { HaiImage } from '@/components/HaiImage';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { ROMANIAN_CITIES } from '@/lib/demo-data';
import type { DatingProfile, RomanianCity } from '@/types/hai';

export function DatingScreen() {
  const {
    datingQueue,
    selectedCity,
    setSelectedCity,
    user,
    updateDiscoveryPrefs,
    likeProfile,
    passProfile,
    resetDiscoveryDeck,
    blockUser,
    openReportModal,
    notifications,
    markAllNotificationsRead,
    askConfirm,
  } = useHai();

  const [showFilters, setShowFilters] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [inspectedProfile, setInspectedProfile] = useState<DatingProfile | null>(null);
  const [dragDirection, setDragDirection] = useState<'left' | 'right' | null>(null);

  const [minAgeDraft, setMinAgeDraft] = useState(user.discoveryPreferences.minAge);
  const [maxAgeDraft, setMaxAgeDraft] = useState(user.discoveryPreferences.maxAge);
  const [cityDraft, setCityDraft] = useState<RomanianCity | 'Toate'>(selectedCity);

  const currentProfile = datingQueue[0] ?? null;
  const unreadNotifs = notifications.filter((n) => !n.read).length;

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setDragDirection(null);
    if (!currentProfile) return;
    if (info.offset.x > 105 || info.velocity.x > 450) {
      likeProfile(currentProfile.id);
    } else if (info.offset.x < -105 || info.velocity.x < -450) {
      passProfile(currentProfile.id);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Compact Header */}
      <header className="flex items-center justify-between gap-3 pb-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="lg:hidden font-display text-2xl font-bold tracking-tight shrink-0">
            hai<span className="text-[#F26B82]">.</span>
          </span>

          <div className="relative">
            <label htmlFor="city-select-header" className="sr-only">
              Selectează orașul
            </label>
            <select
              id="city-select-header"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value as RomanianCity | 'Toate')}
              className="appearance-none min-h-[44px] pl-3.5 pr-8 rounded-full bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] text-sm font-medium text-[#18191D] dark:text-[#F5F5F4] focus:outline-none focus:ring-2 focus:ring-[#F26B82] cursor-pointer"
            >
              <option value="Toate">Toată România</option>
              {ROMANIAN_CITIES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
            <ChevronDown className="h-4 w-4 text-[#717680] pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setMinAgeDraft(user.discoveryPreferences.minAge);
              setMaxAgeDraft(user.discoveryPreferences.maxAge);
              setCityDraft(selectedCity);
              setShowFilters(true);
            }}
            aria-label="Filtre de descoperire"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] text-[#18191D] dark:text-[#F5F5F4] hover:bg-[#F3F3F1] dark:hover:bg-[#22242A] transition-colors"
          >
            <SlidersHorizontal className="h-[18px] w-[18px]" strokeWidth={1.85} />
          </button>

          <button
            type="button"
            onClick={() => {
              setShowNotifications(true);
              markAllNotificationsRead();
            }}
            aria-label="Notificări"
            className="relative min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] text-[#18191D] dark:text-[#F5F5F4] hover:bg-[#F3F3F1] dark:hover:bg-[#22242A] transition-colors"
          >
            <Bell className="h-[18px] w-[18px]" strokeWidth={1.85} />
            {unreadNotifs > 0 && (
              <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-[#F26B82]" />
            )}
          </button>
        </div>
      </header>

      {/* Discreet Demo Notice */}
      <div className="mb-4 flex items-center justify-between text-xs text-[#717680] dark:text-[#9CA3AF]">
        <span>Mod demonstrativ — date fictive</span>
        <span className="tabular-nums">
          {datingQueue.length} {datingQueue.length === 1 ? 'profil rămas' : 'profile disponibile'}
        </span>
      </div>

      {/* Main Content */}
      {currentProfile ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Interactive Photo Card */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              <motion.article
                key={currentProfile.id}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.45}
                onDrag={(_, info) => {
                  if (info.offset.x > 40) setDragDirection('right');
                  else if (info.offset.x < -40) setDragDirection('left');
                  else setDragDirection(null);
                }}
                onDragEnd={handleDragEnd}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="relative w-full aspect-[3/4] max-h-[540px] rounded-3xl overflow-hidden bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] shadow-sm select-none touch-pan-y cursor-grab active:cursor-grabbing"
              >
                <HaiImage
                  photoKey={currentProfile.photoKey}
                  alt={`${currentProfile.name}, ${currentProfile.age} ani, ${currentProfile.city}`}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 520px"
                />

                {/* Contrast Scrim */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />

                {/* Drag Feedback Labels */}
                {dragDirection === 'right' && (
                  <div className="absolute top-5 left-5 px-3.5 py-1.5 rounded-xl bg-[#21866F] text-white text-sm font-semibold shadow">
                    Îmi place
                  </div>
                )}
                {dragDirection === 'left' && (
                  <div className="absolute top-5 right-5 px-3.5 py-1.5 rounded-xl bg-[#18191D]/90 text-white text-sm font-semibold shadow">
                    Treci mai departe
                  </div>
                )}

                {/* Profile Card Text Overlay */}
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 text-white">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight tabular-nums inline-flex items-center gap-2 flex-wrap">
                        <span>
                          {currentProfile.name}, {currentProfile.age}
                        </span>
                        {currentProfile.isVerified && <VerifiedBadge inverted size="md" />}
                      </h1>
                      <p className="mt-0.5 text-sm text-white/85 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          {currentProfile.city} · la {currentProfile.distanceKm} km
                        </span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setInspectedProfile(currentProfile)}
                      aria-label={`Vezi profilul complet pentru ${currentProfile.name}`}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-white/18 backdrop-blur-md text-white hover:bg-white/28 transition-colors shrink-0"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                  </div>

                  <p className="mt-3 text-sm sm:text-[15px] leading-relaxed text-white/95 line-clamp-2">
                    „{currentProfile.bio}”
                  </p>

                  {/* Zero-Pill Unboxed Interests */}
                  <p className="mt-2.5 text-xs font-medium text-white/75">
                    {currentProfile.interests.join(' · ')}
                  </p>
                </div>
              </motion.article>
            </AnimatePresence>

            {/* Accessible Control Buttons */}
            <div className="mt-4 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => passProfile(currentProfile.id)}
                aria-label={`Treci peste ${currentProfile.name}`}
                className="h-14 w-14 rounded-full bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] text-[#717680] hover:text-[#18191D] dark:hover:text-white shadow-sm flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#18191D]"
              >
                <X className="h-6 w-6" strokeWidth={2} />
              </button>

              <button
                type="button"
                onClick={() => setInspectedProfile(currentProfile)}
                aria-label={`Vezi detalii profil ${currentProfile.name}`}
                className="h-12 px-5 rounded-full bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] text-sm font-medium text-[#18191D] dark:text-[#F5F5F4] shadow-sm flex items-center gap-2 hover:bg-[#F3F3F1] dark:hover:bg-[#22242A] transition-colors"
              >
                <Eye className="h-4 w-4" />
                <span>Vezi profil</span>
              </button>

              <button
                type="button"
                onClick={() => likeProfile(currentProfile.id)}
                aria-label={`Apreciază profilul ${currentProfile.name}`}
                className="h-14 w-14 rounded-full bg-[#F26B82] hover:bg-[#E2556E] text-white shadow-md flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F26B82]"
              >
                <Heart className="h-6 w-6 fill-current" strokeWidth={1.85} />
              </button>
            </div>
          </div>

          {/* Desktop Contextual Profile Panel */}
          <aside className="hidden lg:block lg:col-span-5 rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-6 space-y-5">
            <div>
              <p className="text-xs font-medium text-[#717680] dark:text-[#9CA3AF]">
                Detalii profil demonstrativ
              </p>
              <h2 className="mt-1 font-display text-xl font-bold tabular-nums inline-flex items-center gap-2 flex-wrap">
                <span>
                  {currentProfile.name}, {currentProfile.age}
                </span>
                {currentProfile.isVerified && <VerifiedBadge showLabel />}
              </h2>
              <p className="mt-1 text-sm text-[#717680] dark:text-[#9CA3AF] flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 shrink-0" />
                <span>{currentProfile.occupation}</span>
              </p>
            </div>

            <div className="pt-4 border-t border-[#E9E9EC] dark:border-[#272930]">
              <h3 className="text-xs font-medium text-[#717680] dark:text-[#9CA3AF]">
                Despre
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#18191D] dark:text-[#F5F5F4]">
                {currentProfile.bio}
              </p>
            </div>

            <div className="pt-4 border-t border-[#E9E9EC] dark:border-[#272930]">
              <h3 className="text-xs font-medium text-[#717680] dark:text-[#9CA3AF]">
                Ce caută
              </h3>
              <p className="mt-1 text-sm text-[#18191D] dark:text-[#F5F5F4]">
                {currentProfile.lookingFor}
              </p>
            </div>

            <div className="pt-4 border-t border-[#E9E9EC] dark:border-[#272930]">
              <h3 className="text-xs font-medium text-[#717680] dark:text-[#9CA3AF]">
                Interese
              </h3>
              <p className="mt-1 text-sm font-medium text-[#18191D] dark:text-[#F5F5F4]">
                {currentProfile.interests.join(' · ')}
              </p>
            </div>

            <div className="pt-4 border-t border-[#E9E9EC] dark:border-[#272930] flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => likeProfile(currentProfile.id, true)}
                className="min-h-[44px] px-4 rounded-xl bg-[#FFF0F3] dark:bg-[#2D161C] text-[#F26B82] text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Simulează match reciproc</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  openReportModal({
                    targetType: 'user',
                    targetId: currentProfile.id,
                    targetTitle: `${currentProfile.name}, ${currentProfile.age}`,
                  })
                }
                className="min-h-[44px] px-3.5 rounded-xl bg-[#F3F3F1] dark:bg-[#22242A] text-xs font-medium text-[#717680] dark:text-[#9CA3AF] hover:text-[#18191D] dark:hover:text-white flex items-center gap-1.5"
              >
                <Flag className="h-3.5 w-3.5" />
                <span>Raportează</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  askConfirm({
                    title: `Blochezi profilul ${currentProfile.name}?`,
                    description:
                      'Nu vei mai vedea acest profil și nu vei mai primi mesaje de la această persoană.',
                    confirmLabel: 'Blochează',
                    destructive: true,
                    onConfirm: () => blockUser(currentProfile.id, currentProfile.name),
                  })
                }
                className="min-h-[44px] px-3.5 rounded-xl bg-[#F3F3F1] dark:bg-[#22242A] text-xs font-medium text-[#717680] dark:text-[#9CA3AF] hover:text-red-600 flex items-center gap-1.5"
              >
                <ShieldBan className="h-3.5 w-3.5" />
                <span>Blochează</span>
              </button>
            </div>
          </aside>
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-8 sm:p-12 text-center max-w-lg mx-auto my-6">
          <div className="mx-auto h-12 w-12 rounded-full bg-[#FFF0F3] dark:bg-[#2D161C] text-[#F26B82] flex items-center justify-center">
            <RotateCcw className="h-5 w-5" />
          </div>
          <h2 className="mt-4 font-display text-xl font-bold">
            Ai văzut toate profilele disponibile
          </h2>
          <p className="mt-2 text-sm text-[#717680] dark:text-[#9CA3AF]">
            Încearcă să extinzi filtrul de oraș la „Toată România” sau reîmprospătează lista demonstrativă.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => setSelectedCity('Toate')}
              className="min-h-[46px] px-5 rounded-2xl bg-[#18191D] dark:bg-white text-white dark:text-[#18191D] text-sm font-semibold"
            >
              Arată toată România
            </button>
            <button
              type="button"
              onClick={resetDiscoveryDeck}
              className="min-h-[46px] px-5 rounded-2xl bg-[#FFF0F3] dark:bg-[#2D161C] text-[#F26B82] text-sm font-semibold"
            >
              Reia lista demo
            </button>
          </div>
        </div>
      )}

      {/* Inspect Full Profile Drawer / Modal */}
      <AnimatePresence>
        {inspectedProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="inspect-profile-title"
          >
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              className="w-full sm:max-w-lg max-h-[88dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#E9E9EC] dark:border-[#272930]">
                <div>
                  <h2
                    id="inspect-profile-title"
                    className="font-display text-xl font-bold tabular-nums inline-flex items-center gap-2 flex-wrap"
                  >
                    <span>
                      {inspectedProfile.name}, {inspectedProfile.age}
                    </span>
                    {inspectedProfile.isVerified && <VerifiedBadge showLabel />}
                  </h2>
                  <p className="text-xs text-[#717680] dark:text-[#9CA3AF]">
                    {inspectedProfile.occupation} · {inspectedProfile.city}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectedProfile(null)}
                  aria-label="Închide detalii profil"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-[#F3F3F1] dark:hover:bg-[#22242A]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-2.5">
                  {inspectedProfile.galleryKeys.map((key, idx) => (
                    <div
                      key={`${key}-${idx}`}
                      className={`relative rounded-2xl overflow-hidden bg-[#F3F3F1] dark:bg-[#22242A] ${
                        idx === 0 ? 'col-span-2 aspect-[4/3]' : 'aspect-square'
                      }`}
                    >
                      <HaiImage
                        photoKey={key}
                        alt={`${inspectedProfile.name} fotografie ${idx + 1}`}
                        fill
                        sizes="(max-width: 640px) 90vw, 440px"
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <h3 className="text-xs font-medium text-[#717680] dark:text-[#9CA3AF]">
                    Biografie
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed">{inspectedProfile.bio}</p>
                </div>

                <div>
                  <h3 className="text-xs font-medium text-[#717680] dark:text-[#9CA3AF]">
                    Ce caută
                  </h3>
                  <p className="mt-1 text-sm">{inspectedProfile.lookingFor}</p>
                </div>

                <div>
                  <h3 className="text-xs font-medium text-[#717680] dark:text-[#9CA3AF]">
                    Interese
                  </h3>
                  <p className="mt-1 text-sm font-medium">
                    {inspectedProfile.interests.join(' · ')}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#E9E9EC] dark:border-[#272930] flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const target = inspectedProfile;
                      setInspectedProfile(null);
                      likeProfile(target.id, true);
                    }}
                    className="flex-1 min-h-[46px] px-4 rounded-2xl bg-[#F26B82] text-white text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Simulează match</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const target = inspectedProfile;
                      setInspectedProfile(null);
                      openReportModal({
                        targetType: 'user',
                        targetId: target.id,
                        targetTitle: `${target.name}, ${target.age}`,
                      });
                    }}
                    className="min-h-[46px] px-4 rounded-2xl bg-[#F3F3F1] dark:bg-[#22242A] text-sm font-medium flex items-center gap-1.5"
                  >
                    <Flag className="h-4 w-4" />
                    <span>Raportează</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const target = inspectedProfile;
                      setInspectedProfile(null);
                      askConfirm({
                        title: `Blochezi profilul ${target.name}?`,
                        description:
                          'Profilul va fi ascuns imediat din descoperire și conversații.',
                        confirmLabel: 'Blochează',
                        destructive: true,
                        onConfirm: () => blockUser(target.id, target.name),
                      });
                    }}
                    className="min-h-[46px] px-4 rounded-2xl bg-[#F3F3F1] dark:bg-[#22242A] text-sm font-medium text-red-600 flex items-center gap-1.5"
                  >
                    <ShieldBan className="h-4 w-4" />
                    <span>Blochează</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Discovery Filters Sheet */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="filter-title"
          >
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-6"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E9E9EC] dark:border-[#272930]">
                <h2 id="filter-title" className="font-display text-lg font-bold">
                  Filtre descoperire
                </h2>
                <button
                  type="button"
                  onClick={() => setShowFilters(false)}
                  aria-label="Închide filtrele"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#717680] mb-1.5">
                    Oraș preferat
                  </label>
                  <select
                    value={cityDraft}
                    onChange={(e) => setCityDraft(e.target.value as RomanianCity | 'Toate')}
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
                      value={minAgeDraft}
                      onChange={(e) =>
                        setMinAgeDraft(Math.max(18, Number(e.target.value) || 18))
                      }
                      className="w-full min-h-[46px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3.5 text-sm tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#717680] mb-1.5">
                      Vârstă maximă
                    </label>
                    <input
                      type="number"
                      min={minAgeDraft}
                      max={99}
                      value={maxAgeDraft}
                      onChange={(e) =>
                        setMaxAgeDraft(Math.max(minAgeDraft, Number(e.target.value) || 35))
                      }
                      className="w-full min-h-[46px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3.5 text-sm tabular-nums"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setCityDraft('Cluj-Napoca');
                    setMinAgeDraft(20);
                    setMaxAgeDraft(38);
                  }}
                  className="min-h-[46px] px-4 rounded-2xl bg-[#F3F3F1] dark:bg-[#22242A] text-sm font-medium"
                >
                  Resetează
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateDiscoveryPrefs({
                      city: cityDraft,
                      minAge: Math.max(18, minAgeDraft),
                      maxAge: Math.max(minAgeDraft, maxAgeDraft),
                    });
                    setShowFilters(false);
                  }}
                  className="flex-1 min-h-[46px] rounded-2xl bg-[#F26B82] text-white text-sm font-semibold"
                >
                  Aplică filtrele
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications Sheet */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="notif-title"
          >
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-6"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E9E9EC] dark:border-[#272930]">
                <div className="flex items-center gap-2">
                  <h2 id="notif-title" className="font-display text-lg font-bold">
                    Notificări
                  </h2>
                  <CheckCheck className="h-4 w-4 text-[#21866F]" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowNotifications(false)}
                  aria-label="Închide notificările"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 max-h-[60dvh] overflow-y-auto">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="pb-3 border-b last:border-b-0 border-[#E9E9EC] dark:border-[#272930]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{n.title}</p>
                      <span className="text-xs text-[#717680] shrink-0">{n.time}</span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-[#717680] dark:text-[#9CA3AF]">
                      {n.body}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
