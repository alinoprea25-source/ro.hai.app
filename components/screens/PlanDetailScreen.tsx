'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Flag,
  KeyRound,
  MapPin,
  Plus,
  RefreshCw,
  Share2,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
import { useHai } from '@/components/HaiContext';
import { HaiImage } from '@/components/HaiImage';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import type { PlanChangeProposal, PlanLifecycleStatus, PlanProposedSlot } from '@/types/hai';

export const LIFECYCLE_META: Record<
  PlanLifecycleStatus,
  { label: string; description: string; toneClass: string }
> = {
  PROPOSED: {
    label: 'Propus',
    description: 'Propunerea a fost creată și așteaptă confirmarea reciprocă.',
    toneClass: 'text-[#717680] dark:text-[#9CA3AF]',
  },
  AWAITING_CONFIRMATION: {
    label: 'Așteaptă confirmarea',
    description: 'Planul devine confirmat doar după ce toți participanții acceptă data, ora și locația.',
    toneClass: 'text-[#D97706] dark:text-[#FBBF24]',
  },
  CONFIRMED: {
    label: 'Confirmat reciproc',
    description: 'Toți participanții au acceptat data, ora și locul de întâlnire.',
    toneClass: 'text-[#21866F] dark:text-[#34D399]',
  },
  RECONFIRMATION_REQUIRED: {
    label: 'Necesită reconfirmare',
    description: 'Reconfirmă prezența înaintea termenului limită pentru a evita neprezentările.',
    toneClass: 'text-[#D97706] dark:text-[#FBBF24]',
  },
  CHANGE_PROPOSED: {
    label: 'Modificare propusă',
    description: 'Au fost propuse opțiuni alternative. Confirmările anterioare au fost resetate.',
    toneClass: 'text-[#F26B82]',
  },
  RESCHEDULED: {
    label: 'Reprogramat și confirmat',
    description: 'Noua dată, oră și locație au fost acceptate reciproc.',
    toneClass: 'text-[#21866F] dark:text-[#34D399]',
  },
  CANCELLED: {
    label: 'Anulat',
    description: 'Acest plan a fost anulat. Poți alege o alternativă sau reprograma în siguranță.',
    toneClass: 'text-red-600 dark:text-red-400',
  },
  COMPLETED: {
    label: 'Finalizat',
    description: 'Întâlnirea sau activitatea a avut loc.',
    toneClass: 'text-[#21866F] dark:text-[#34D399]',
  },
  DISPUTED: {
    label: 'În contestație',
    description: 'Statusul prezenței este în curs de analiză de către moderare.',
    toneClass: 'text-[#D97706] dark:text-[#FBBF24]',
  },
};

export function PlanDetailScreen() {
  const {
    plans,
    selectedPlanId,
    setScreen,
    openPlans,
    activities,
    openActivityDetail,
    user,
    planProposals,
    planStatusEvents,
    waitlistOffers,
    confirmOrReconfirmPlan,
    proposeReschedule,
    respondRescheduleProposal,
    cancelPlanSafe,
    submitGroupCheckIn,
    respondWaitlistOffer,
    trustedContacts,
    sharePlanWithContact,
    blockUser,
    openReportModal,
    showToast,
  } = useHai();

  const plan = plans.find((p) => p.id === selectedPlanId) ?? plans[0];

  const [rescheduleMode, setRescheduleMode] = useState<PlanChangeProposal['kind'] | null>(null);
  const [slots, setSlots] = useState<PlanProposedSlot[]>([
    {
      id: 'slot-1',
      isoDate: plan?.isoDate || '2026-12-04',
      dateLabel: 'Vineri, 4 dec',
      time: '18:30',
      location: plan?.location || 'Centru · Cafenea publică',
    },
  ]);
  const [proposalNote, setProposalNote] = useState('');
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [safetyCancel, setSafetyCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [checkInCodeInput, setCheckInCodeInput] = useState('');
  const [busy, setBusy] = useState(false);

  const pendingProposals = useMemo(
    () =>
      plan
        ? planProposals.filter((pr) => pr.planId === plan.id && pr.status === 'PENDING')
        : [],
    [plan, planProposals]
  );

  const events = useMemo(
    () => (plan ? planStatusEvents.filter((e) => e.planId === plan.id) : []),
    [plan, planStatusEvents]
  );

  const linkedActivity = useMemo(
    () => (plan?.activityId ? activities.find((a) => a.id === plan.activityId) : undefined),
    [activities, plan]
  );

  const activeWaitlistOffer = useMemo(
    () =>
      plan?.activityId
        ? waitlistOffers.find(
            (o) =>
              o.activityId === plan.activityId &&
              o.userId === user.id &&
              o.status === 'PENDING'
          )
        : undefined,
    [plan, user.id, waitlistOffers]
  );

  // Replacement suggestions for cancelled group activities ONLY (never replacement people for dating!)
  const replacementActivities = useMemo(() => {
    if (!plan || plan.type === 'meetup' || plan.lifecycleStatus !== 'CANCELLED') return [];
    return activities
      .filter(
        (a) =>
          a.id !== plan.activityId &&
          !a.isCancelled &&
          !a.isEnded &&
          a.city === plan.city &&
          a.participants.length < a.maxParticipants
      )
      .slice(0, 3);
  }, [activities, plan]);

  if (!plan) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-[#717680]">Planul nu a fost găsit.</p>
        <button
          type="button"
          onClick={openPlans}
          className="mt-4 min-h-[44px] px-5 rounded-xl bg-[#18191D] text-white text-sm font-semibold"
        >
          Înapoi la Planuri
        </button>
      </div>
    );
  }

  const meta = LIFECYCLE_META[plan.lifecycleStatus];
  const userConfirmation = plan.confirmations.find((c) => c.userId === user.id);
  const needsMyConfirm =
    (plan.lifecycleStatus === 'AWAITING_CONFIRMATION' ||
      plan.lifecycleStatus === 'PROPOSED') &&
    !userConfirmation?.confirmed;
  const needsMyReconfirm =
    plan.lifecycleStatus === 'RECONFIRMATION_REQUIRED' &&
    !userConfirmation?.reconfirmed;

  const isActionable =
    plan.lifecycleStatus !== 'CANCELLED' && plan.lifecycleStatus !== 'COMPLETED';

  const openRescheduleDrawer = (kind: PlanChangeProposal['kind']) => {
    setRescheduleMode(kind);
    setSlots([
      {
        id: `slot-${Date.now()}-1`,
        isoDate: plan.isoDate || '2026-12-04',
        dateLabel: plan.dateLabel || 'Altă zi',
        time: kind === 'time' ? '19:00' : plan.time,
        location: kind === 'location' ? '' : plan.location,
      },
    ]);
  };

  const addSlotOption = () => {
    if (slots.length >= 3) return;
    setSlots((prev) => [
      ...prev,
      {
        id: `slot-${Date.now()}-${prev.length + 1}`,
        isoDate: '2026-12-05',
        dateLabel: 'Sâmbătă, 5 dec',
        time: '18:00',
        location: plan.location,
      },
    ]);
  };

  const handleSubmitReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleMode) return;
    setBusy(true);
    const formatted = slots.map((s) => ({
      ...s,
      dateLabel:
        s.dateLabel ||
        new Date(`${s.isoDate}T12:00:00`).toLocaleDateString('ro-RO', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        }),
    }));
    const ok = await proposeReschedule(plan.id, rescheduleMode, formatted, proposalNote);
    setBusy(false);
    if (ok) {
      setRescheduleMode(null);
      setProposalNote('');
    }
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const ok = await cancelPlanSafe(plan.id, {
      safetyReason: safetyCancel,
      reasonText: cancelReason,
    });
    setBusy(false);
    if (ok) {
      setCancelModalOpen(false);
      setSafetyCancel(false);
      setCancelReason('');
    }
  };

  const handleShareVoluntary = async () => {
    const contact = trustedContacts[0];
    if (contact) {
      sharePlanWithContact(plan.id, contact.name);
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(
        `Plan HAI.: ${plan.title} — ${plan.dateLabel}, ${plan.time} · ${plan.location}`
      );
      showToast('Detaliile planului au fost copiate pentru partajare voluntară.', 'success');
    }
  };

  return (
    <div className="min-h-dvh bg-[#FAFAF9] dark:bg-[#0E0F12] text-[#18191D] dark:text-[#F5F5F4] pb-20">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-[#FAFAF9]/90 dark:bg-[#0E0F12]/90 backdrop-blur-md border-b border-[#E9E9EC] dark:border-[#272930]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={openPlans}
            aria-label="Înapoi la Planurile mele"
            className="min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center rounded-full hover:bg-[#F3F3F1] dark:hover:bg-[#22242A]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <p className="text-sm font-semibold truncate">Detalii plan</p>
          <button
            type="button"
            onClick={() => setScreen('safety')}
            aria-label="Centru de siguranță"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-[#21866F] dark:text-[#34D399]"
          >
            <Shield className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-5 space-y-5">
        {/* Status Banner */}
        <section className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-5 space-y-3">
          <div className="flex items-start gap-3.5">
            <div className="relative h-16 w-16 rounded-2xl overflow-hidden bg-[#F3F3F1] dark:bg-[#22242A] shrink-0">
              <HaiImage photoKey={plan.photoKey} alt={plan.title} fill sizes="64px" />
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-bold inline-flex items-center gap-1.5 ${meta.toneClass}`}>
                {plan.lifecycleStatus === 'CANCELLED' ? (
                  <XCircle className="h-4 w-4 shrink-0" />
                ) : plan.lifecycleStatus === 'CONFIRMED' ||
                  plan.lifecycleStatus === 'RESCHEDULED' ||
                  plan.lifecycleStatus === 'COMPLETED' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <Clock className="h-4 w-4 shrink-0" />
                )}
                <span>Stare: {meta.label}</span>
              </p>
              <h1 className="mt-1 font-display text-xl sm:text-2xl font-bold tracking-tight">
                {plan.title}
              </h1>
              <p className="mt-1 text-xs text-[#717680] dark:text-[#9CA3AF] tabular-nums">
                {plan.type === 'meetup'
                  ? 'Întâlnire 1-la-1 (Dating)'
                  : plan.type === 'organized'
                  ? 'Activitate organizată de tine'
                  : 'Activitate de grup'}{' '}
                · Actualizat la {new Date(plan.lastUpdatedAt).toLocaleString('ro-RO')}
              </p>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-[#717680] dark:text-[#9CA3AF]">
            {meta.description}
          </p>

          <div className="pt-3 border-t border-[#E9E9EC] dark:border-[#272930] grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm tabular-nums">
            <div className="flex items-start gap-2.5">
              <Calendar className="h-4 w-4 text-[#F26B82] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-[#717680]">Data și ora</p>
                <p className="font-semibold">
                  {plan.dateLabel}, {plan.time}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPin className="h-4 w-4 text-[#F26B82] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-[#717680]">Loc de întâlnire</p>
                <p className="font-semibold">
                  {plan.city} · {plan.location}
                </p>
              </div>
            </div>
          </div>

          {plan.reconfirmationDeadlineIso && isActionable && (
            <div className="rounded-2xl bg-[#FAFAF9] dark:bg-[#0E0F12] border border-[#E9E9EC] dark:border-[#272930] p-3.5 text-xs space-y-1">
              <p className="font-semibold tabular-nums">
                Termen reconfirmare:{' '}
                {new Date(plan.reconfirmationDeadlineIso).toLocaleString('ro-RO', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              <p className="text-[#717680] dark:text-[#9CA3AF]">
                {plan.reconfirmationPolicyRo ||
                  (plan.type === 'meetup'
                    ? 'Pentru întâlnirile 1-la-1 nu înlocuim niciodată partenerul.'
                    : 'Reconfirmarea ne anunță dacă planul rămâne valabil și permite alocarea locului liber următorului doritor.')}
              </p>
            </div>
          )}
        </section>

        {/* Active Waitlist Offer if any */}
        {activeWaitlistOffer && (
          <section className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#21866F] p-5 space-y-3">
            <div className="flex items-start gap-2.5">
              <Sparkles className="h-5 w-5 text-[#21866F] dark:text-[#34D399] shrink-0 mt-0.5" />
              <div>
                <h2 className="font-display text-base font-bold">
                  Loc disponibil de pe lista de așteptare
                </h2>
                <p className="mt-1 text-xs text-[#717680] dark:text-[#9CA3AF] tabular-nums">
                  Ai o fereastră limitată până la{' '}
                  {new Date(activeWaitlistOffer.expiresAt).toLocaleTimeString('ro-RO', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  pentru a confirma explicit participarea.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void respondWaitlistOffer(activeWaitlistOffer.id, 'ACCEPT')}
                className="min-h-[44px] px-5 rounded-xl bg-[#21866F] text-white text-xs font-semibold"
              >
                Acceptă locul acum
              </button>
              <button
                type="button"
                onClick={() => void respondWaitlistOffer(activeWaitlistOffer.id, 'DECLINE')}
                className="min-h-[44px] px-4 rounded-xl bg-[#F3F3F1] dark:bg-[#22242A] text-xs font-semibold"
              >
                Refuză locul
              </button>
            </div>
          </section>
        )}

        {/* Mutual Confirmations List */}
        {plan.confirmations.length > 0 && (
          <section className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-5 space-y-3">
            <h2 className="font-display text-base font-bold inline-flex items-center gap-2">
              <Users className="h-4 w-4 text-[#F26B82]" />
              <span>Confirmări participanți ({plan.confirmations.length})</span>
            </h2>
            <div className="divide-y divide-[#E9E9EC] dark:divide-[#272930]">
              {plan.confirmations.map((conf) => (
                <div
                  key={conf.userId}
                  className="py-2.5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative h-9 w-9 rounded-full overflow-hidden border border-[#E9E9EC] dark:border-[#272930] shrink-0">
                      <HaiImage photoKey={conf.photoKey} alt={conf.userName} fill sizes="36px" />
                    </div>
                    <span className="text-sm font-medium inline-flex items-center gap-1 truncate">
                      <span>{conf.userName}</span>
                      {conf.isVerified && <VerifiedBadge />}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-semibold shrink-0 ${
                      conf.reconfirmed || conf.confirmed
                        ? 'text-[#21866F] dark:text-[#34D399]'
                        : 'text-[#D97706] dark:text-[#FBBF24]'
                    }`}
                  >
                    {conf.reconfirmed
                      ? 'Reconfirmat'
                      : conf.confirmed
                      ? 'Confirmat'
                      : 'Așteaptă confirmare'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Pending Reschedule Proposals */}
        {pendingProposals.map((prop) => {
          const isMyProposal = prop.proposedByUserId === user.id;
          return (
            <section
              key={prop.id}
              className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#F26B82] p-5 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-base font-bold">
                  {isMyProposal
                    ? 'Propunerea ta de reprogramare este în așteptare'
                    : `${prop.proposedByName} a propus noi opțiuni`}
                </h2>
                <span className="text-xs font-medium text-[#F26B82]">
                  {prop.slots.length} opțiuni
                </span>
              </div>
              {prop.note && (
                <p className="text-xs text-[#717680] dark:text-[#9CA3AF]">
                  Notă: {prop.note}
                </p>
              )}
              <div className="space-y-2">
                {prop.slots.map((sl) => (
                  <div
                    key={sl.id}
                    className="rounded-2xl bg-[#FAFAF9] dark:bg-[#0E0F12] border border-[#E9E9EC] dark:border-[#272930] p-3 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="text-xs tabular-nums">
                      <p className="font-semibold">
                        {sl.dateLabel} · {sl.time}
                      </p>
                      <p className="text-[#717680]">{sl.location}</p>
                    </div>
                    {!isMyProposal && (
                      <button
                        type="button"
                        onClick={() => void respondRescheduleProposal(prop.id, 'ACCEPT', sl.id)}
                        className="min-h-[40px] px-4 rounded-xl bg-[#21866F] text-white text-xs font-semibold"
                      >
                        Acceptă varianta
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {!isMyProposal && (
                <button
                  type="button"
                  onClick={() => void respondRescheduleProposal(prop.id, 'REJECT')}
                  className="min-h-[40px] px-4 rounded-xl bg-[#F3F3F1] dark:bg-[#22242A] text-xs font-semibold"
                >
                  Refuză opțiunile
                </button>
              )}
            </section>
          );
        })}

        {/* Primary Action Bar: Confirm / One-Tap Reschedule / Cancel */}
        {isActionable && (
          <section className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-5 space-y-4">
            <h2 className="font-display text-base font-bold">Acțiuni rapide</h2>

            {(needsMyConfirm || needsMyReconfirm) && (
              <button
                type="button"
                onClick={() =>
                  void confirmOrReconfirmPlan(
                    plan.id,
                    needsMyReconfirm ? 'reconfirm' : 'confirm'
                  )
                }
                className="w-full min-h-[48px] px-5 rounded-2xl bg-[#21866F] text-white text-sm font-semibold flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  {needsMyReconfirm
                    ? 'Reconfirm prezența acum'
                    : 'Confirmă data, ora și locația'}
                </span>
              </button>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => openRescheduleDrawer('day')}
                className="min-h-[44px] px-3 rounded-xl bg-[#F3F3F1] dark:bg-[#22242A] text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Propune altă zi</span>
              </button>
              <button
                type="button"
                onClick={() => openRescheduleDrawer('time')}
                className="min-h-[44px] px-3 rounded-xl bg-[#F3F3F1] dark:bg-[#22242A] text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Schimbă ora</span>
              </button>
              <button
                type="button"
                onClick={() => openRescheduleDrawer('location')}
                className="min-h-[44px] px-3 rounded-xl bg-[#F3F3F1] dark:bg-[#22242A] text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <MapPin className="h-3.5 w-3.5" />
                <span>Schimbă locația</span>
              </button>
              <button
                type="button"
                onClick={() => setCancelModalOpen(true)}
                className="min-h-[44px] px-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <XCircle className="h-3.5 w-3.5" />
                <span>Anulează planul</span>
              </button>
            </div>

            {linkedActivity && (
              <button
                type="button"
                onClick={() => openActivityDetail(linkedActivity.id)}
                className="w-full min-h-[44px] px-4 rounded-xl border border-[#E9E9EC] dark:border-[#272930] text-xs font-semibold"
              >
                Deschide pagina activității (Comentarii, Recenzii & Listă de așteptare)
              </button>
            )}
          </section>
        )}

        {/* Group Check-in OR 1-to-1 Safety Privacy Notice */}
        {plan.type !== 'meetup' && plan.activityId && isActionable ? (
          <section className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-bold inline-flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-[#21866F] dark:text-[#34D399]" />
                <span>Check-in voluntar la activitate</span>
              </h2>
              {plan.checkedIn && (
                <span className="text-xs font-semibold text-[#21866F] dark:text-[#34D399]">
                  Prezență confirmată
                </span>
              )}
            </div>
            <p className="text-xs text-[#717680] dark:text-[#9CA3AF]">
              Introdu codul scurt afișat de organizator la punctul de întâlnire pentru a confirma voluntar prezența (fără GPS continuu).
              {linkedActivity?.checkInCode ? ` Cod demo pentru această activitate: ${linkedActivity.checkInCode}.` : ''}
            </p>
            {!plan.checkedIn && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await submitGroupCheckIn(plan.activityId!, checkInCodeInput);
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  maxLength={10}
                  value={checkInCodeInput}
                  onChange={(e) => setCheckInCodeInput(e.target.value.toUpperCase())}
                  placeholder="Cod activitate (ex: PAD428)"
                  className="flex-1 min-h-[44px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3.5 text-sm uppercase tabular-nums"
                />
                <button
                  type="submit"
                  className="min-h-[44px] px-5 rounded-xl bg-[#21866F] text-white text-xs font-semibold"
                >
                  Confirmă
                </button>
              </form>
            )}
          </section>
        ) : (
          <section className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-5 space-y-3">
            <h2 className="font-display text-base font-bold inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#21866F] dark:text-[#34D399]" />
              <span>Confidențialitate și siguranță întâlnire 1-la-1</span>
            </h2>
            <p className="text-xs text-[#717680] dark:text-[#9CA3AF]">
              Întâlnirile private de dating nu folosesc coduri de prezență sau localizare GPS. Poți partaja voluntar detaliile planului cu un contact de încredere.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleShareVoluntary}
                className="min-h-[44px] px-4 rounded-xl bg-[#F3F3F1] dark:bg-[#22242A] text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Partajează voluntar cu contactul de încredere</span>
              </button>
              {plan.partnerId && plan.partnerName && (
                <button
                  type="button"
                  onClick={() => blockUser(plan.partnerId!, plan.partnerName!)}
                  className="min-h-[44px] px-4 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 border border-[#E9E9EC] dark:border-[#272930]"
                >
                  Blochează utilizatorul
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  openReportModal({
                    targetType: plan.partnerId ? 'user' : 'activity',
                    targetId: plan.partnerId || plan.activityId || plan.id,
                    targetTitle: plan.partnerName || plan.title,
                  })
                }
                className="min-h-[44px] px-3 rounded-xl text-xs font-medium text-[#717680] inline-flex items-center gap-1"
              >
                <Flag className="h-3.5 w-3.5" />
                <span>Raportează</span>
              </button>
            </div>
          </section>
        )}

        {/* Cancelled Recovery Section */}
        {plan.lifecycleStatus === 'CANCELLED' && (
          <section className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-5 space-y-3">
            {plan.type === 'meetup' ? (
              <>
                <h2 className="font-display text-base font-bold">
                  Întâlnirea a fost anulată
                </h2>
                <p className="text-xs text-[#717680] dark:text-[#9CA3AF]">
                  Dacă dorești, poți propune opțional o nouă dată din lista de mesaje sau poți folosi oricând opțiunile din Centrul de siguranță. Nu sugerăm niciodată o altă persoană ca „înlocuitor”.
                </p>
              </>
            ) : (
              <>
                <h2 className="font-display text-base font-bold">
                  Alternative disponibile în {plan.city}
                </h2>
                <p className="text-xs text-[#717680] dark:text-[#9CA3AF]">
                  Îți poți alege manual o activitate similară cu locuri libere:
                </p>
                {replacementActivities.length === 0 ? (
                  <p className="text-xs text-[#717680]">
                    Nu am găsit activități disponibile momentan în {plan.city}.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {replacementActivities.map((alt) => (
                      <div
                        key={alt.id}
                        className="rounded-2xl bg-[#FAFAF9] dark:bg-[#0E0F12] border border-[#E9E9EC] dark:border-[#272930] p-3.5 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{alt.title}</p>
                          <p className="text-xs text-[#717680] tabular-nums">
                            {alt.dateLabel} · {alt.time} · {alt.maxParticipants - alt.participants.length} locuri libere
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => openActivityDetail(alt.id)}
                          className="min-h-[40px] px-4 rounded-xl bg-[#18191D] dark:bg-white text-white dark:text-[#18191D] text-xs font-semibold shrink-0"
                        >
                          Vezi opțiunea
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* Status History Timeline */}
        <section className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-5 space-y-3">
          <h2 className="font-display text-base font-bold inline-flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-[#717680]" />
            <span>Istoric stare plan</span>
          </h2>
          {events.length === 0 ? (
            <p className="text-xs text-[#717680]">
              Nicio modificare suplimentară înregistrată până acum.
            </p>
          ) : (
            <div className="space-y-2.5">
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className="text-xs border-b last:border-b-0 border-[#E9E9EC] dark:border-[#272930] pb-2.5 last:pb-0"
                >
                  <p className="font-semibold">
                    {LIFECYCLE_META[ev.toStatus]?.label ?? ev.toStatus}{' '}
                    <span className="font-normal text-[#717680] tabular-nums">
                      · {new Date(ev.createdAt).toLocaleString('ro-RO')}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[#717680] dark:text-[#9CA3AF]">
                    {ev.actorName}: {ev.summary}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* One-Tap Reschedule Drawer */}
      {rescheduleMode && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSubmitReschedule}
            className="w-full sm:max-w-lg max-h-[90dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-6 space-y-4"
          >
            <h3 className="font-display text-lg font-bold">
              {rescheduleMode === 'day'
                ? 'Propune altă zi (până la 3 opțiuni)'
                : rescheduleMode === 'time'
                ? 'Schimbă ora întâlnirii'
                : 'Propune altă locație publică'}
            </h3>
            <p className="text-xs text-[#717680] dark:text-[#9CA3AF]">
              Un plan confirmat nu se modifică unilateral. Cealaltă persoană va putea accepta una dintre opțiunile tale sau păstra/anula planul.
            </p>

            <div className="space-y-3">
              {slots.map((slot, idx) => (
                <div
                  key={slot.id}
                  className="rounded-2xl bg-[#FAFAF9] dark:bg-[#0E0F12] border border-[#E9E9EC] dark:border-[#272930] p-3.5 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold tabular-nums">
                      Opțiunea {idx + 1}
                    </span>
                    {slots.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setSlots((prev) => prev.filter((s) => s.id !== slot.id))
                        }
                        aria-label="Elimină opțiunea"
                        className="text-xs text-red-600 inline-flex items-center gap-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Elimină</span>
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      required
                      value={slot.isoDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSlots((prev) =>
                          prev.map((s) =>
                            s.id === slot.id
                              ? {
                                  ...s,
                                  isoDate: val,
                                  dateLabel: new Date(`${val}T12:00:00`).toLocaleDateString(
                                    'ro-RO',
                                    { weekday: 'short', day: 'numeric', month: 'short' }
                                  ),
                                }
                              : s
                          )
                        );
                      }}
                      className="min-h-[42px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-white dark:bg-[#18191D] px-3 text-xs tabular-nums"
                    />
                    <input
                      type="time"
                      required
                      value={slot.time}
                      onChange={(e) =>
                        setSlots((prev) =>
                          prev.map((s) =>
                            s.id === slot.id ? { ...s, time: e.target.value } : s
                          )
                        )
                      }
                      className="min-h-[42px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-white dark:bg-[#18191D] px-3 text-xs tabular-nums"
                    />
                  </div>
                  <input
                    type="text"
                    required
                    value={slot.location}
                    onChange={(e) =>
                      setSlots((prev) =>
                        prev.map((s) =>
                          s.id === slot.id ? { ...s, location: e.target.value } : s
                        )
                      )
                    }
                    placeholder="Loc public de întâlnire"
                    className="w-full min-h-[42px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-white dark:bg-[#18191D] px-3 text-xs"
                  />
                </div>
              ))}

              {slots.length < 3 && (
                <button
                  type="button"
                  onClick={addSlotOption}
                  className="min-h-[40px] px-3.5 rounded-xl bg-[#F3F3F1] dark:bg-[#22242A] text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Adaugă încă o opțiune ({slots.length}/3)</span>
                </button>
              )}
            </div>

            <input
              type="text"
              maxLength={200}
              value={proposalNote}
              onChange={(e) => setProposalNote(e.target.value)}
              placeholder="Mesaj scurt (opțional)"
              className="w-full min-h-[42px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3 text-xs"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRescheduleMode(null)}
                className="min-h-[44px] px-4 rounded-xl bg-[#F3F3F1] dark:bg-[#22242A] text-xs font-semibold"
              >
                Renunță
              </button>
              <button
                type="submit"
                disabled={busy}
                className="min-h-[44px] px-5 rounded-xl bg-[#F26B82] text-white text-xs font-semibold disabled:opacity-50"
              >
                {busy ? 'Se trimite...' : 'Trimite propunerea'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Immediate Safe Cancellation Modal */}
      {cancelModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleConfirmCancel}
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-6 space-y-4"
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-display text-lg font-bold">
                  Anulezi planul „{plan.title}”?
                </h3>
                <p className="mt-1 text-xs text-[#717680] dark:text-[#9CA3AF]">
                  Poți anula oricând imediat. Dacă acesta este o activitate de grup, locul tău poate fi oferit persoanei următoare de pe lista de așteptare.
                </p>
              </div>
            </div>

            <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#FAFAF9] dark:bg-[#0E0F12] border border-[#E9E9EC] dark:border-[#272930] cursor-pointer">
              <input
                type="checkbox"
                checked={safetyCancel}
                onChange={(e) => setSafetyCancel(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#21866F]"
              />
              <div className="text-xs">
                <p className="font-semibold">
                  Anulez dintr-un motiv de siguranță sau disconfort
                </p>
                <p className="text-[#717680] dark:text-[#9CA3AF]">
                  Motivul rămâne strict confidențial față de cealaltă persoană și nu îți afectează niciodată scorul de fiabilitate.
                </p>
              </div>
            </label>

            <input
              type="text"
              maxLength={200}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Detalii opționale"
              className="w-full min-h-[42px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3 text-xs"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="min-h-[44px] px-4 rounded-xl bg-[#F3F3F1] dark:bg-[#22242A] text-xs font-semibold"
              >
                Înapoi
              </button>
              <button
                type="submit"
                disabled={busy}
                className="min-h-[44px] px-5 rounded-xl bg-red-600 text-white text-xs font-semibold disabled:opacity-50"
              >
                {busy ? 'Se anulează...' : 'Confirmă anularea'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
