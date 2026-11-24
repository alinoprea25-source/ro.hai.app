'use client';

import React, { useMemo, useState } from 'react';
import { Bookmark, Calendar, ChevronDown, Search } from 'lucide-react';
import { useHai } from '@/components/HaiContext';
import { HaiImage } from '@/components/HaiImage';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { ROMANIAN_CITIES } from '@/lib/demo-data';
import type { ActivityCategory, RomanianCity } from '@/types/hai';

const CATEGORIES: ('Toate' | ActivityCategory)[] = [
  'Toate',
  'Sport',
  'Social',
  'Outdoor',
  'Cultură',
];

export function ActivitiesScreen() {
  const {
    activities,
    selectedCity,
    setSelectedCity,
    openActivityDetail,
    savedActivityIds,
    toggleSaveActivity,
    user,
    plans,
    openPlans,
  } = useHai();

  const [activeCategory, setActiveCategory] = useState<'Toate' | ActivityCategory>('Toate');
  const [searchQuery, setSearchQuery] = useState('');

  const upcomingPlansCount = plans.filter((p) => p.status === 'upcoming').length;

  const filteredActivities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return activities.filter((act) => {
      if (activeCategory !== 'Toate' && act.category !== activeCategory) return false;
      if (selectedCity !== 'Toate' && act.city !== selectedCity) return false;
      if (
        q &&
        !act.title.toLowerCase().includes(q) &&
        !act.location.toLowerCase().includes(q) &&
        !act.description.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [activities, activeCategory, selectedCity, searchQuery]);

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5">
        <div>
          <p className="text-xs text-[#717680] dark:text-[#9CA3AF]">
            Mod demonstrativ — date fictive
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-balance">
            Ce facem azi?
          </h1>
          <p className="mt-1 text-sm sm:text-base text-[#717680] dark:text-[#9CA3AF]">
            Descoperă activități în orașul tău.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={openPlans}
            className="min-h-[44px] px-4 rounded-full bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] text-sm font-medium flex items-center gap-2 hover:bg-[#F3F3F1] dark:hover:bg-[#22242A] transition-colors tabular-nums"
          >
            <Calendar className="h-4 w-4 text-[#F26B82]" />
            <span>Planurile mele ({upcomingPlansCount})</span>
          </button>

          <div className="relative">
            <select
              aria-label="Filtrează activitățile după oraș"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value as RomanianCity | 'Toate')}
              className="appearance-none min-h-[44px] pl-3.5 pr-8 rounded-full bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#F26B82] cursor-pointer"
            >
              <option value="Toate">Toate orașele</option>
              {ROMANIAN_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown className="h-4 w-4 text-[#717680] pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </header>

      {/* Search & Category Filters */}
      <div className="space-y-3 mb-6">
        <div className="relative max-w-md">
          <Search className="h-4 w-4 text-[#717680] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Caută padel, drumeție, cafea, cinema..."
            className="w-full min-h-[44px] rounded-2xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#F26B82]"
          />
        </div>

        <div
          role="tablist"
          aria-label="Categorii de activități"
          className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1"
        >
          {CATEGORIES.map((category) => {
            const isSelected = activeCategory === category;
            return (
              <button
                key={category}
                role="tab"
                aria-selected={isSelected}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`min-h-[40px] px-4 rounded-full text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${
                  isSelected
                    ? 'bg-[#18191D] text-white dark:bg-white dark:text-[#18191D]'
                    : 'bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] text-[#717680] dark:text-[#9CA3AF] hover:text-[#18191D] dark:hover:text-white'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>

      {/* Activity Cards Grid */}
      {filteredActivities.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-8 text-center max-w-md mx-auto">
          <h2 className="font-display text-lg font-semibold">
            Nicio activitate găsită
          </h2>
          <p className="mt-1.5 text-sm text-[#717680] dark:text-[#9CA3AF]">
            Încearcă să schimbi categoria sau să selectezi „Toate orașele”.
          </p>
          <button
            type="button"
            onClick={() => {
              setActiveCategory('Toate');
              setSelectedCity('Toate');
              setSearchQuery('');
            }}
            className="mt-4 min-h-[44px] px-5 rounded-2xl bg-[#18191D] dark:bg-[#F26B82] text-white text-sm font-semibold"
          >
            Resetează filtrele
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredActivities.map((act) => {
            const spotsLeft = Math.max(0, act.maxParticipants - act.participants.length);
            const isSaved = savedActivityIds.includes(act.id);
            const isJoined = act.participants.some((p) => p.id === user.id);

            return (
              <article
                key={act.id}
                className="group rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] overflow-hidden flex flex-col transition-transform duration-150 hover:-translate-y-0.5"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F3F3F1] dark:bg-[#22242A]">
                  <button
                    type="button"
                    onClick={() => openActivityDetail(act.id)}
                    className="block w-full h-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F26B82]"
                    aria-label={`Deschide detalii pentru ${act.title}`}
                  >
                    <HaiImage
                      photoKey={act.photoKey}
                      customUrl={act.customImageUrl}
                      alt={act.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      className="transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleSaveActivity(act.id)}
                    aria-label={isSaved ? 'Elimină din salvate' : 'Salvează activitatea'}
                    className="absolute top-3 right-3 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-black/45 backdrop-blur-md text-white hover:bg-black/65 transition-colors"
                  >
                    <Bookmark
                      className={`h-4 w-4 ${isSaved ? 'fill-current text-[#F26B82]' : ''}`}
                    />
                  </button>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-xs text-[#717680] dark:text-[#9CA3AF] tabular-nums">
                      {act.category} · {act.dateLabel} · {act.time} · {act.city}
                    </p>

                    <button
                      type="button"
                      onClick={() => openActivityDetail(act.id)}
                      className="mt-1.5 text-left block w-full focus-visible:outline-none focus-visible:underline"
                    >
                      <h2 className="font-display text-lg font-bold leading-snug text-[#18191D] dark:text-[#F5F5F4] group-hover:text-[#F26B82] transition-colors">
                        {act.title}
                      </h2>
                    </button>

                    <p className="mt-1.5 text-sm text-[#717680] dark:text-[#9CA3AF] inline-flex items-center gap-1.5 flex-wrap">
                      <span>Organizator: {act.organizerName}</span>
                      {act.organizerVerified && <VerifiedBadge />}
                    </p>
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-[#E9E9EC] dark:border-[#272930] flex items-center justify-between gap-3">
                    <div className="text-xs text-[#717680] dark:text-[#9CA3AF] tabular-nums">
                      <span className="font-semibold text-[#18191D] dark:text-[#F5F5F4]">
                        {act.participants.length}/{act.maxParticipants}
                      </span>{' '}
                      participanți ·{' '}
                      <span
                        className={
                          act.isEnded
                            ? 'text-[#717680] font-medium'
                            : spotsLeft === 0
                            ? 'text-[#D97706] dark:text-[#FBBF24] font-medium'
                            : 'text-[#21866F] dark:text-[#34D399] font-medium'
                        }
                      >
                        {act.isEnded
                          ? 'Încheiată'
                          : spotsLeft === 0
                          ? 'Complet · Listă de așteptare'
                          : spotsLeft === 1
                          ? '1 loc liber'
                          : `${spotsLeft} locuri libere`}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-[#18191D] dark:text-[#F5F5F4] tabular-nums shrink-0">
                      {isJoined
                        ? 'Înscris'
                        : act.priceLei
                        ? `${act.priceLei} lei`
                        : 'Gratuit'}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
