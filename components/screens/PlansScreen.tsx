'use client';

import React, { useMemo, useState } from 'react';
import {
  BellRing,
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  MapPin,
  Share2,
  X,
  XCircle,
} from 'lucide-react';
import { useHai } from '@/components/HaiContext';
import { HaiImage } from '@/components/HaiImage';
import { LIFECYCLE_META } from '@/components/screens/PlanDetailScreen';
import type { ActivityItem, PlanStatus } from '@/types/hai';

const PLAN_TABS: { id: PlanStatus; label: string }[] = [
  { id: 'upcoming', label: 'Viitoare' },
  { id: 'pending', label: 'În așteptare' },
  { id: 'completed', label: 'Finalizate' },
  { id: 'cancelled', label: 'Anulate' },
];

export function PlansScreen() {
  const {
    plans,
    activities,
    openActivityDetail,
    openPlanDetail,
    confirmOrReconfirmPlan,
    evaluateServerReminders,
    cancelPlan,
    updateActivity,
    askConfirm,
    trustedContacts,
    sharePlanWithContact,
    user,
    showToast,
  } = useHai();

  const [statusTab, setStatusTab] = useState<PlanStatus>('upcoming');
  const [editingActivity, setEditingActivity] = useState<ActivityItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editTime, setEditTime] = useState('');

  const filteredPlans = useMemo(
    () => plans.filter((p) => p.status === statusTab),
    [plans, statusTab]
  );

  const handleShareVoluntary = async (
    planId: string,
    title: string,
    location: string,
    time: string
  ) => {
    const primaryContact = trustedContacts[0];
    if (primaryContact) {
      sharePlanWithContact(planId, primaryContact.name);
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(`Plan HAI.: ${title} (${time}, ${location})`);
      showToast('Detaliile planului au fost copiate pentru partajare voluntară.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Honest Demo Mode Server Scheduler Disclosure */}
      <div className="rounded-2xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[#717680] dark:text-[#9CA3AF]">
          <strong className="font-semibold text-[#18191D] dark:text-[#F5F5F4]">
            Mod demonstrativ:
          </strong>{' '}
          Planificarea automată a reconfirmărilor rulează la cerere prin endpoint-ul de server (fără Cloud Cron activ).
        </p>
        <button
          type="button"
          onClick={() => void evaluateServerReminders()}
          className="min-h-[38px] px-3.5 rounded-xl bg-[#F3F3F1] dark:bg-[#22242A] text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 hover:opacity-90"
        >
          <BellRing className="h-3.5 w-3.5 text-[#F26B82]" />
          <span>Rulează evaluarea reconfirmărilor</span>
        </button>
      </div>

      <div
        role="tablist"
        aria-label="Stare planuri"
        className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1"
      >
        {PLAN_TABS.map((tab) => {
          const count = plans.filter((p) => p.status === tab.id).length;
          const active = statusTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => setStatusTab(tab.id)}
              className={`min-h-[40px] px-4 rounded-full text-sm font-medium whitespace-nowrap shrink-0 tabular-nums transition-colors ${
                active
                  ? 'bg-[#18191D] text-white dark:bg-white dark:text-[#18191D]'
                  : 'bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] text-[#717680] dark:text-[#9CA3AF]'
              }`}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {filteredPlans.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-8 text-center">
          <Calendar className="h-8 w-8 mx-auto text-[#717680]" strokeWidth={1.6} />
          <h3 className="mt-3 font-display text-lg font-semibold">
            Niciun plan în această secțiune
          </h3>
          <p className="mt-1 text-sm text-[#717680] dark:text-[#9CA3AF]">
            Înscrie-te la o activitate sau propune o întâlnire unui match.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPlans.map((plan) => {
            const linkedActivity = plan.activityId
              ? activities.find((a) => a.id === plan.activityId)
              : undefined;
            const meta = LIFECYCLE_META[plan.lifecycleStatus];
            const myConf = plan.confirmations.find((c) => c.userId === user.id);
            const needsConfirm =
              (plan.lifecycleStatus === 'AWAITING_CONFIRMATION' ||
                plan.lifecycleStatus === 'PROPOSED') &&
              !myConf?.confirmed;
            const needsReconfirm =
              plan.lifecycleStatus === 'RECONFIRMATION_REQUIRED' &&
              !myConf?.reconfirmed;

            return (
              <article
                key={plan.id}
                className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-4 flex flex-col justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className="relative h-20 w-20 rounded-2xl overflow-hidden shrink-0 bg-[#F3F3F1] dark:bg-[#22242A]">
                    <HaiImage photoKey={plan.photoKey} alt={plan.title} fill sizes="80px" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-semibold inline-flex items-center gap-1 ${meta.toneClass}`}>
                      {plan.lifecycleStatus === 'CANCELLED' ? (
                        <XCircle className="h-3.5 w-3.5 shrink-0" />
                      ) : plan.lifecycleStatus === 'CONFIRMED' ||
                        plan.lifecycleStatus === 'RESCHEDULED' ||
                        plan.lifecycleStatus === 'COMPLETED' ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                      )}
                      <span>{meta.label}</span>
                    </p>

                    <p className="mt-0.5 text-xs text-[#717680] dark:text-[#9CA3AF] tabular-nums">
                      {plan.type === 'meetup'
                        ? 'Întâlnire 1-la-1'
                        : plan.type === 'organized'
                        ? 'Organizat de tine'
                        : 'Activitate de grup'}{' '}
                      · {plan.dateLabel} · {plan.time}
                    </p>
                    <h3 className="mt-0.5 font-display text-base font-bold truncate">
                      {plan.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-[#717680] dark:text-[#9CA3AF] flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {plan.city} · {plan.location}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-[#717680] dark:text-[#9CA3AF]">
                      {plan.subtitle}
                    </p>
                    {plan.reconfirmationDeadlineIso &&
                      plan.lifecycleStatus === 'RECONFIRMATION_REQUIRED' && (
                        <p className="mt-0.5 text-[11px] font-medium text-[#D97706] dark:text-[#FBBF24] tabular-nums">
                          Termen:{' '}
                          {new Date(plan.reconfirmationDeadlineIso).toLocaleString('ro-RO', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      )}
                    {plan.sharedWithTrustedContact && (
                      <p className="mt-0.5 text-[11px] text-[#717680]">
                        Partajat voluntar cu {plan.sharedWithTrustedContact}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E9E9EC] dark:border-[#272930] flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openPlanDetail(plan.id)}
                    className="min-h-[40px] px-3.5 rounded-xl bg-[#18191D] dark:bg-white text-white dark:text-[#18191D] text-xs font-semibold hover:opacity-90"
                  >
                    Detalii & Acțiuni
                  </button>

                  {(needsConfirm || needsReconfirm) && (
                    <button
                      type="button"
                      onClick={() =>
                        void confirmOrReconfirmPlan(
                          plan.id,
                          needsReconfirm ? 'reconfirm' : 'confirm'
                        )
                      }
                      className="min-h-[40px] px-3.5 rounded-xl bg-[#21866F] text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{needsReconfirm ? 'Reconfirmă' : 'Confirmă'}</span>
                    </button>
                  )}

                  {linkedActivity && (
                    <button
                      type="button"
                      onClick={() => openActivityDetail(linkedActivity.id)}
                      className="min-h-[40px] px-3 rounded-xl bg-[#F3F3F1] dark:bg-[#22242A] text-xs font-medium hover:opacity-90"
                    >
                      Activitate
                    </button>
                  )}

                  {plan.type === 'organized' && linkedActivity && plan.status === 'upcoming' && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingActivity(linkedActivity);
                        setEditTitle(linkedActivity.title);
                        setEditLocation(linkedActivity.location);
                        setEditTime(linkedActivity.time);
                      }}
                      className="min-h-[40px] px-3 rounded-xl bg-[#F3F3F1] dark:bg-[#22242A] text-xs font-medium flex items-center gap-1.5"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Editează</span>
                    </button>
                  )}

                  {plan.status === 'upcoming' && (
                    <button
                      type="button"
                      onClick={() =>
                        handleShareVoluntary(plan.id, plan.title, plan.location, plan.time)
                      }
                      className="min-h-[40px] px-3 rounded-xl bg-[#F3F3F1] dark:bg-[#22242A] text-xs font-medium flex items-center gap-1.5"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      <span>Partajează</span>
                    </button>
                  )}

                  {(plan.status === 'upcoming' || plan.status === 'pending') && (
                    <button
                      type="button"
                      onClick={() =>
                        askConfirm({
                          title: `Anulezi planul „${plan.title}”?`,
                          description:
                            'Poți folosi și „Detalii & Acțiuni” pentru a propune altă zi sau pentru anulare confidențială din motiv de siguranță.',
                          confirmLabel: 'Anulează planul',
                          destructive: true,
                          onConfirm: () => cancelPlan(plan.id),
                        })
                      }
                      className="min-h-[40px] px-3 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 ml-auto"
                    >
                      Anulează
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Edit Organized Activity Modal */}
      {editingActivity && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateActivity(editingActivity.id, {
                title: editTitle.trim() || editingActivity.title,
                location: editLocation.trim() || editingActivity.location,
                time: editTime || editingActivity.time,
              });
              setEditingActivity(null);
            }}
            className="w-full max-w-md rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">Editează activitatea</h3>
              <button
                type="button"
                onClick={() => setEditingActivity(null)}
                aria-label="Închide editarea"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-[#717680] dark:text-[#9CA3AF]">
              Modificarea orei sau locației invalidează confirmările anterioare și solicită reconfirmarea participanților.
            </p>
            <div>
              <label className="block text-xs font-medium text-[#717680] mb-1">Titlu</label>
              <input
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#717680] mb-1">Locație</label>
              <input
                type="text"
                required
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#717680] mb-1">Ora</label>
              <input
                type="time"
                required
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingActivity(null)}
                className="min-h-[44px] px-4 rounded-xl bg-[#F3F3F1] dark:bg-[#22242A] text-sm font-medium"
              >
                Renunță
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-5 rounded-xl bg-[#F26B82] text-white text-sm font-semibold"
              >
                Salvează
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
