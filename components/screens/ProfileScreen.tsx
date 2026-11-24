'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  BadgeCheck,
  BarChart3,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Compass,
  Edit3,
  Lock,
  Moon,
  Scale,
  Settings,
  Shield,
  ShieldAlert,
  Star,
  Sun,
  UserCheck,
  X,
} from 'lucide-react';
import { useHai } from '@/components/HaiContext';
import { HaiImage } from '@/components/HaiImage';
import {
  ReliabilityProfileCard,
  ReliabilityTransparencyModal,
} from '@/components/ReliabilityBadge';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { PlansScreen } from '@/components/screens/PlansScreen';
import { authorizedFetch } from '@/lib/api-client';
import { ROMANIAN_CITIES } from '@/lib/demo-data';
import type {
  ActivityCategory,
  ActivityReview,
  AttendanceDispute,
  ModerationActionLog,
  RomanianCity,
  SafetyReport,
  TrustAnalyticsMetrics,
  VerificationSubmission,
} from '@/types/hai';

const ALL_CATEGORIES: ActivityCategory[] = ['Sport', 'Social', 'Outdoor', 'Cultură'];

export function ProfileScreen() {
  const {
    user,
    isAuthenticated,
    isServerAdmin,
    updateUserProfile,
    updateDiscoveryPrefs,
    updateReconfirmationSettings,
    setScreen,
    theme,
    toggleTheme,
    plans,
    reports,
    profileSubView: subView,
    setProfileSubView: setSubView,
    openVerificationModal,
    applyVerificationDecision,
    startOnboarding,
    userReliability,
    refreshUserReliability,
    submitDispute,
    showToast,
  } = useHai();

  const [editing, setEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [reliabilityModalOpen, setReliabilityModalOpen] = useState(false);

  const [nameDraft, setNameDraft] = useState(user.name);
  const [ageDraft, setAgeDraft] = useState(user.age);
  const [cityDraft, setCityDraft] = useState<RomanianCity>(user.city);
  const [occupationDraft, setOccupationDraft] = useState(user.occupation);
  const [bioDraft, setBioDraft] = useState(user.bio);
  const [interestsDraft, setInterestsDraft] = useState(user.interests.join(', '));
  const [prefsDraft, setPrefsDraft] = useState<ActivityCategory[]>(user.activityPreferences);

  const [organizedReviews, setOrganizedReviews] = useState<ActivityReview[]>([]);
  const [serverReports, setServerReports] = useState<SafetyReport[]>([]);
  const [moderationActions, setModerationActions] = useState<ModerationActionLog[]>([]);
  const [disputesQueue, setDisputesQueue] = useState<AttendanceDispute[]>([]);
  const [analytics, setAnalytics] = useState<TrustAnalyticsMetrics | null>(null);
  const [verificationQueue, setVerificationQueue] = useState<VerificationSubmission[]>([]);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const loadModerationConsole = useCallback(async () => {
    if (!isAuthenticated || !isServerAdmin) return;
    try {
      const [repRes, verRes] = await Promise.all([
        authorizedFetch('/api/moderation/report'),
        authorizedFetch('/api/verification?scope=admin'),
      ]);
      if (repRes.ok) {
        const data = await repRes.json();
        if (data?.entries) setServerReports(data.entries);
        if (data?.moderationActions) setModerationActions(data.moderationActions);
        if (data?.disputes) setDisputesQueue(data.disputes);
        if (data?.analytics) setAnalytics(data.analytics);
      }
      if (verRes.ok) {
        const vData = await verRes.json();
        if (vData?.submissions) setVerificationQueue(vData.submissions);
      }
    } catch {
      // Ignore transient errors
    }
  }, [isAuthenticated, isServerAdmin]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void refreshUserReliability();
    authorizedFetch(`/api/activities/any/reviews?organizerId=${encodeURIComponent(user.id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data?.reviews)) setOrganizedReviews(data.reviews);
      })
      .catch(() => {});
  }, [isAuthenticated, refreshUserReliability, user.id]);

  useEffect(() => {
    if (subView === 'moderation' && !isServerAdmin) {
      setSubView('profile');
      return;
    }
    if (!isAuthenticated || !isServerAdmin || subView !== 'moderation') return;
    let active = true;
    Promise.all([
      authorizedFetch('/api/moderation/report').then((r) => (r.ok ? r.json() : null)),
      authorizedFetch('/api/verification?scope=admin').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([repData, verData]) => {
        if (!active) return;
        if (repData?.entries) setServerReports(repData.entries);
        if (repData?.moderationActions) setModerationActions(repData.moderationActions);
        if (repData?.disputes) setDisputesQueue(repData.disputes);
        if (repData?.analytics) setAnalytics(repData.analytics);
        if (verData?.submissions) setVerificationQueue(verData.submissions);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isAuthenticated, isServerAdmin, setSubView, subView]);

  const handleReviewVerification = async (
    submission: VerificationSubmission,
    decision: 'verified' | 'rejected'
  ) => {
    if (!isServerAdmin) return;
    setReviewingId(submission.id);
    try {
      const reviewNote =
        decision === 'verified'
          ? 'Fotografie verificată de moderator.'
          : 'Gestul nu este suficient de clar. Te rugăm să retrimiți.';
      const res = await authorizedFetch('/api/verification', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submissionId: submission.id,
          decision,
          reviewNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Nu am putut procesa decizia.', 'error');
        return;
      }
      setVerificationQueue((prev) =>
        prev.map((item) =>
          item.id === submission.id
            ? {
                ...item,
                status: decision,
                reviewNote,
                reviewedAt: data.submission?.reviewedAt || new Date().toISOString(),
              }
            : item
        )
      );
      applyVerificationDecision(submission.userId, decision, reviewNote);
    } catch {
      showToast('Eroare de rețea la procesarea verificării.', 'error');
    } finally {
      setReviewingId(null);
    }
  };

  const handleModerateReport = async (
    reportId: string,
    decision: 'REMOVE_CONTENT' | 'DISMISS' | 'GRANT_APPEAL'
  ) => {
    if (!isServerAdmin) return;
    const res = await authorizedFetch('/api/moderation/report', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reportId,
        decision,
        reason:
          decision === 'REMOVE_CONTENT'
            ? 'Conținut eliminat conform ghidului comunității.'
            : decision === 'GRANT_APPEAL'
            ? 'Contestație acceptată; conținutul a fost restabilit.'
            : 'Raport analizat fără încălcare identificată.',
      }),
    });
    if (res.ok) {
      await loadModerationConsole();
      showToast('Acțiune de moderare înregistrată.', 'success');
    } else {
      const data = await res.json().catch(() => null);
      showToast(data?.error || 'Acțiune de moderare respinsă.', 'error');
    }
  };

  const handleResolveDispute = async (
    disputeId: string,
    outcome: 'RESOLVED_EXCUSED' | 'RESOLVED_UPHELD'
  ) => {
    if (!isServerAdmin) return;
    const res = await authorizedFetch('/api/attendance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'resolve_dispute',
        disputeId,
        outcome,
      }),
    });
    if (res.ok) {
      await loadModerationConsole();
      await refreshUserReliability();
      showToast(
        outcome === 'RESOLVED_EXCUSED'
          ? 'Contestația a fost aprobată; scorul a fost recalculat fără penalizare.'
          : 'Contestația a fost respinsă conform evidenței.',
        'success'
      );
    } else {
      const data = await res.json().catch(() => null);
      showToast(data?.error || 'Nu am putut soluționa contestația.', 'error');
    }
  };

  const upcomingCount = plans.filter((p) => p.status === 'upcoming').length;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedInterests = interestsDraft
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 8);

    setSavingProfile(true);
    try {
      await updateUserProfile({
        name: nameDraft.trim() || user.name,
        age: Math.max(18, Math.min(99, ageDraft)),
        city: cityDraft,
        occupation: occupationDraft.trim(),
        bio: bioDraft.trim(),
        interests: parsedInterests,
        activityPreferences: prefsDraft,
      });
      setEditing(false);
    } catch {
      showToast('Nu am putut salva modificările în cont. Încearcă din nou.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleCategoryPref = (cat: ActivityCategory) => {
    setPrefsDraft((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const combinedReports = [
    ...reports,
    ...serverReports.filter((sr) => !reports.some((lr) => lr.id === sr.id)),
  ];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-[#717680] dark:text-[#9CA3AF]">
            {subView === 'profile'
              ? 'Cont HAI. conectat · Profil și preferințe salvate'
              : subView === 'moderation' && isServerAdmin
              ? 'Consolă administrativă · Acces verificat pe server'
              : 'Planurile și reconfirmările tale'}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
            {subView === 'plans'
              ? 'Planurile mele'
              : subView === 'moderation' && isServerAdmin
              ? 'Moderare & Fiabilitate'
              : 'Profil'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Comută la modul luminos' : 'Comută la modul întunecat'}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930]"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={() => setScreen('safety')}
            aria-label="Centru de siguranță"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] text-[#21866F] dark:text-[#34D399]"
          >
            <Shield className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => setScreen('settings')}
            aria-label="Setări"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930]"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Segmented Switch */}
      <div
        role="tablist"
        aria-label="Secțiuni profil"
        className="inline-flex flex-wrap items-center gap-1 p-1 rounded-2xl bg-[#F3F3F1] dark:bg-[#22242A]"
      >
        <button
          role="tab"
          aria-selected={subView === 'profile'}
          type="button"
          onClick={() => setSubView('profile')}
          className={`min-h-[40px] px-4 rounded-xl text-sm font-medium transition-colors ${
            subView === 'profile'
              ? 'bg-white dark:bg-[#18191D] text-[#18191D] dark:text-white shadow-sm'
              : 'text-[#717680] dark:text-[#9CA3AF]'
          }`}
        >
          Profilul meu
        </button>

        <button
          role="tab"
          aria-selected={subView === 'plans'}
          type="button"
          onClick={() => setSubView('plans')}
          className={`min-h-[40px] px-4 rounded-xl text-sm font-medium tabular-nums transition-colors ${
            subView === 'plans'
              ? 'bg-white dark:bg-[#18191D] text-[#18191D] dark:text-white shadow-sm'
              : 'text-[#717680] dark:text-[#9CA3AF]'
          }`}
        >
          Planurile mele ({upcomingCount})
        </button>

        {isServerAdmin && (
          <button
            role="tab"
            aria-selected={subView === 'moderation'}
            type="button"
            onClick={() => setSubView('moderation')}
            className={`min-h-[40px] px-4 rounded-xl text-sm font-medium transition-colors ${
              subView === 'moderation'
                ? 'bg-white dark:bg-[#18191D] text-[#18191D] dark:text-white shadow-sm'
                : 'text-[#717680] dark:text-[#9CA3AF]'
            }`}
          >
            Moderare
          </button>
        )}
      </div>

      {subView === 'plans' ? (
        <PlansScreen />
      ) : subView === 'moderation' && isServerAdmin ? (
        <div className="space-y-6">
          {/* Aggregate Trust & Anti-Cancellation Analytics */}
          {analytics && (
            <section className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-6 space-y-4">
              <div className="flex items-start gap-3">
                <BarChart3 className="h-5 w-5 text-[#21866F] dark:text-[#34D399] shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-display text-lg font-bold">
                    Indicatori agregați planuri & fiabilitate
                  </h2>
                  <p className="mt-1 text-xs text-[#717680] dark:text-[#9CA3AF]">
                    Fereastră: {analytics.windowLabel} · Toate ratele afișează explicit numărătorul și numitorul.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
                <div className="rounded-2xl bg-[#FAFAF9] dark:bg-[#0E0F12] p-3.5">
                  <p className="text-lg font-display font-bold">
                    {analytics.confirmedPlansCount}/{analytics.totalPlansCount}
                  </p>
                  <p className="text-[11px] text-[#717680]">Planuri confirmate</p>
                </div>
                <div className="rounded-2xl bg-[#FAFAF9] dark:bg-[#0E0F12] p-3.5">
                  <p className="text-lg font-display font-bold">
                    {analytics.reconfirmationResponsesCount}/{analytics.reconfirmationRequestsCount}
                  </p>
                  <p className="text-[11px] text-[#717680]">Răspuns reconfirmare</p>
                </div>
                <div className="rounded-2xl bg-[#FAFAF9] dark:bg-[#0E0F12] p-3.5">
                  <p className="text-lg font-display font-bold">
                    {analytics.waitlistReplacementsAcceptedCount}/{analytics.waitlistSpotsOpenedCount}
                  </p>
                  <p className="text-[11px] text-[#717680]">Locuri preluate din așteptare</p>
                </div>
                <div className="rounded-2xl bg-[#FAFAF9] dark:bg-[#0E0F12] p-3.5">
                  <p className="text-lg font-display font-bold">
                    {analytics.rescheduleSuccessCount}/{analytics.rescheduleProposalsCount}
                  </p>
                  <p className="text-[11px] text-[#717680]">Reprogramări acceptate</p>
                </div>
              </div>
            </section>
          )}

          {/* Attendance Disputes Queue */}
          <section className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-6 space-y-4">
            <div className="flex items-start gap-3">
              <Scale className="h-5 w-5 text-[#F26B82] shrink-0 mt-0.5" />
              <div>
                <h2 className="font-display text-lg font-bold">
                  Contestații prezență și fiabilitate ({disputesQueue.length})
                </h2>
                <p className="mt-1 text-xs text-[#717680] dark:text-[#9CA3AF]">
                  Soluționarea ca „Scutit” exclude permanent înregistrarea și recalculează automat scorul de fiabilitate.
                </p>
              </div>
            </div>

            {disputesQueue.length === 0 ? (
              <p className="text-sm text-[#717680]">Nicio contestație înregistrată.</p>
            ) : (
              <div className="divide-y divide-[#E9E9EC] dark:divide-[#272930]">
                {disputesQueue.map((disp) => (
                  <div
                    key={disp.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">
                        {disp.userName} · {disp.activityTitle}
                      </p>
                      <p className="text-xs text-[#717680] dark:text-[#9CA3AF]">
                        Motiv: {disp.reason}
                      </p>
                      <p className="text-xs font-medium text-[#21866F] dark:text-[#34D399]">
                        Statut:{' '}
                        {disp.status === 'OPEN'
                          ? 'Deschisă'
                          : disp.status === 'RESOLVED_EXCUSED'
                          ? 'Aprobată (Scutit)'
                          : 'Respinsă (Menținut)'}
                      </p>
                    </div>
                    {disp.status === 'OPEN' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => void handleResolveDispute(disp.id, 'RESOLVED_UPHELD')}
                          className="min-h-[40px] px-3.5 rounded-xl bg-[#F3F3F1] dark:bg-[#22242A] text-xs font-semibold"
                        >
                          Menține
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleResolveDispute(disp.id, 'RESOLVED_EXCUSED')}
                          className="min-h-[40px] px-3.5 rounded-xl bg-[#21866F] text-white text-xs font-semibold"
                        >
                          Scutește & Recalculează
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Verification Review Queue (Admin Only) */}
          <section className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-6 space-y-4">
            <div className="flex items-start gap-3">
              <BadgeCheck className="h-5 w-5 text-[#21866F] dark:text-[#34D399] shrink-0 mt-0.5" />
              <div>
                <h2 className="font-display text-lg font-bold">
                  Cereri de verificare profil ({verificationQueue.length})
                </h2>
                <p className="mt-1 text-xs text-[#717680] dark:text-[#9CA3AF]">
                  Fotografiile de verificare cu gest sunt accesibile exclusiv în această coadă administrativă privată.
                </p>
              </div>
            </div>

            {verificationQueue.length === 0 ? (
              <p className="text-sm text-[#717680] dark:text-[#9CA3AF]">
                Nu există cereri de verificare în așteptare. Trimite o verificare din Profilul meu pentru a o revizui aici.
              </p>
            ) : (
              <div className="divide-y divide-[#E9E9EC] dark:divide-[#272930]">
                {verificationQueue.map((sub) => (
                  <div
                    key={sub.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="relative h-20 w-16 rounded-2xl overflow-hidden border border-[#E9E9EC] dark:border-[#272930] bg-[#18191D] shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={sub.photoDataUrl}
                          alt={`Fotografie verificare ${sub.userName}`}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-semibold">
                          {sub.userName}{' '}
                          <span className="text-xs font-normal text-[#717680] tabular-nums">
                            · {new Date(sub.submittedAt).toLocaleString('ro-RO')}
                          </span>
                        </p>
                        <p className="text-xs text-[#717680] dark:text-[#9CA3AF]">
                          Gest cerut: {sub.poseInstruction}
                        </p>
                        <p
                          className={`text-xs font-semibold ${
                            sub.status === 'verified'
                              ? 'text-[#21866F] dark:text-[#34D399]'
                              : sub.status === 'rejected'
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-[#F26B82]'
                          }`}
                        >
                          Statut:{' '}
                          {sub.status === 'verified'
                            ? 'Aprobat'
                            : sub.status === 'rejected'
                            ? 'Respins'
                            : 'În așteptare'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={reviewingId === sub.id || sub.status === 'rejected'}
                        onClick={() => handleReviewVerification(sub, 'rejected')}
                        className="min-h-[44px] px-4 rounded-xl bg-[#F3F3F1] dark:bg-[#22242A] text-xs font-semibold text-red-600 dark:text-red-400 disabled:opacity-45 flex items-center gap-1.5"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Respinge</span>
                      </button>
                      <button
                        type="button"
                        disabled={reviewingId === sub.id || sub.status === 'verified'}
                        onClick={() => handleReviewVerification(sub, 'verified')}
                        className="min-h-[44px] px-4 rounded-xl bg-[#21866F] text-white text-xs font-semibold disabled:opacity-45 flex items-center gap-1.5"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Aprobă</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Safety Reports Queue & Action Logs */}
          <section className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-6 space-y-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-[#F26B82] shrink-0 mt-0.5" />
              <div>
                <h2 className="font-display text-lg font-bold">
                  Raportări & Moderare conținut ({combinedReports.length})
                </h2>
                <p className="mt-1 text-xs text-[#717680] dark:text-[#9CA3AF]">
                  Comentariile și recenziile raportate pot fi eliminate sau restabilite prin contestație. Mesajele private nu sunt expuse aici.
                </p>
              </div>
            </div>

            <div className="divide-y divide-[#E9E9EC] dark:divide-[#272930]">
              {combinedReports.length === 0 ? (
                <p className="py-3 text-sm text-[#717680] dark:text-[#9CA3AF]">
                  Nicio raportare activă momentan.
                </p>
              ) : (
                combinedReports.map((rep) => (
                  <div
                    key={rep.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {rep.targetTitle}{' '}
                        <span className="text-xs font-normal text-[#717680]">
                          ({rep.targetType === 'user'
                            ? 'Utilizator'
                            : rep.targetType === 'comment'
                            ? 'Comentariu'
                            : rep.targetType === 'review'
                            ? 'Recenzie'
                            : 'Activitate'})
                        </span>
                      </p>
                      <p className="text-xs text-[#717680] dark:text-[#9CA3AF]">
                        Motiv: {rep.reason}
                        {rep.details ? ` · ${rep.details}` : ''}
                      </p>
                      <p className="text-xs font-medium text-[#21866F] dark:text-[#34D399] capitalize mt-0.5">
                        Statut: {rep.status}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {rep.status === 'în analiză' && (
                        <>
                          <button
                            type="button"
                            onClick={() => void handleModerateReport(rep.id, 'DISMISS')}
                            className="min-h-[38px] px-3 rounded-xl bg-[#F3F3F1] dark:bg-[#22242A] text-xs font-semibold"
                          >
                            Respinge raportul
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleModerateReport(rep.id, 'REMOVE_CONTENT')}
                            className="min-h-[38px] px-3 rounded-xl bg-red-600 text-white text-xs font-semibold"
                          >
                            Elimină conținutul
                          </button>
                        </>
                      )}
                      {rep.status === 'eliminat' && (
                        <button
                          type="button"
                          onClick={() => void handleModerateReport(rep.id, 'GRANT_APPEAL')}
                          className="min-h-[38px] px-3 rounded-xl bg-[#21866F] text-white text-xs font-semibold"
                        >
                          Restabilește (Appeal)
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {moderationActions.length > 0 && (
              <div className="pt-4 border-t border-[#E9E9EC] dark:border-[#272930] space-y-2">
                <h3 className="text-xs font-semibold text-[#717680]">
                  Jurnal acțiuni moderare ({moderationActions.length})
                </h3>
                <div className="space-y-1.5 text-xs text-[#717680] dark:text-[#9CA3AF]">
                  {moderationActions.slice(0, 6).map((act) => (
                    <p key={act.id} className="tabular-nums">
                      {new Date(act.createdAt).toLocaleString('ro-RO')} · {act.action} ({act.targetType}) — {act.reason}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Profile Overview & Reviews about Organized Activities */}
          <div className="lg:col-span-7 space-y-6">
            <section className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-20 rounded-full overflow-hidden border border-[#E9E9EC] dark:border-[#272930] shrink-0">
                    <HaiImage
                      photoKey={user.photoKey}
                      customUrl={user.customPhotoUrl}
                      alt={user.name}
                      fill
                      sizes="80px"
                    />
                  </div>
                  <div>
                    <h2 className="font-display text-2xl font-bold tabular-nums inline-flex items-center gap-2 flex-wrap">
                      <span>
                        {user.name}, {user.age}
                      </span>
                      {user.verificationStatus === 'verified' && (
                        <VerifiedBadge showLabel size="md" />
                      )}
                    </h2>
                    <p className="text-sm text-[#717680] dark:text-[#9CA3AF]">
                      {user.occupation ? `${user.occupation} · ` : ''}
                      {user.city}
                    </p>
                    <p className="mt-1 text-xs text-[#21866F] dark:text-[#34D399] inline-flex items-center gap-1 font-medium">
                      <UserCheck className="h-3.5 w-3.5" />
                      <span>Cont adult 18+ · Firebase Auth</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setNameDraft(user.name);
                    setAgeDraft(user.age);
                    setCityDraft(user.city);
                    setOccupationDraft(user.occupation);
                    setBioDraft(user.bio);
                    setInterestsDraft(user.interests.join(', '));
                    setPrefsDraft(user.activityPreferences);
                    setEditing(true);
                  }}
                  className="min-h-[44px] px-4 rounded-2xl bg-[#18191D] dark:bg-white text-white dark:text-[#18191D] text-sm font-semibold flex items-center justify-center gap-2 shrink-0"
                >
                  <Edit3 className="h-4 w-4" />
                  <span>Editează profilul</span>
                </button>
              </div>

              <div className="pt-4 border-t border-[#E9E9EC] dark:border-[#272930]">
                <h3 className="text-xs font-medium text-[#717680] dark:text-[#9CA3AF]">
                  Biografie
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed">
                  {user.bio || 'Nu ai adăugat încă o biografie.'}
                </p>
              </div>

              <div className="pt-4 border-t border-[#E9E9EC] dark:border-[#272930]">
                <h3 className="text-xs font-medium text-[#717680] dark:text-[#9CA3AF]">
                  Interese
                </h3>
                <p className="mt-1.5 text-sm font-medium">
                  {user.interests.length > 0
                    ? user.interests.join(' · ')
                    : 'Niciun interes adăugat încă'}
                </p>
              </div>

              <div className="pt-4 border-t border-[#E9E9EC] dark:border-[#272930]">
                <h3 className="text-xs font-medium text-[#717680] dark:text-[#9CA3AF]">
                  Activități preferate
                </h3>
                <p className="mt-1.5 text-sm font-medium">
                  {user.activityPreferences.join(' · ')}
                </p>
              </div>

              {/* Photos Gallery */}
              <div className="pt-4 border-t border-[#E9E9EC] dark:border-[#272930]">
                <h3 className="text-xs font-medium text-[#717680] dark:text-[#9CA3AF] mb-2.5">
                  Fotografii
                </h3>
                <div className="grid grid-cols-3 gap-2.5">
                  {([user.photoKey, 'padel', 'hiking'] as const).map((key, idx) => (
                    <div
                      key={`${key}-${idx}`}
                      className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-[#F3F3F1] dark:bg-[#22242A]"
                    >
                      <HaiImage
                        photoKey={key}
                        customUrl={idx === 0 ? user.customPhotoUrl : undefined}
                        alt={`Fotografie profil ${idx + 1}`}
                        fill
                        sizes="180px"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Reviews about Organized Activities */}
            <section className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-base font-bold inline-flex items-center gap-2">
                  <Star className="h-4 w-4 text-[#F26B82]" />
                  <span>Recenzii despre activitățile organizate ({organizedReviews.length})</span>
                </h3>
              </div>
              <p className="text-xs text-[#717680] dark:text-[#9CA3AF]">
                Provine exclusiv de la participanți cu prezență verificată. Recenziile sunt separate de scorul de fiabilitate.
              </p>

              {organizedReviews.length === 0 ? (
                <p className="text-xs text-[#717680]">
                  Încă nu există recenzii pentru activitățile organizate de tine.
                </p>
              ) : (
                <div className="divide-y divide-[#E9E9EC] dark:divide-[#272930]">
                  {organizedReviews.map((rev) => (
                    <div key={rev.id} className="py-3 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold">
                          {rev.authorName} · {rev.activityTitle}
                        </span>
                        {rev.rating && (
                          <span className="font-semibold tabular-nums">{rev.rating}/5</span>
                        )}
                      </div>
                      <p className="text-sm text-[#717680] dark:text-[#9CA3AF]">
                        {rev.feedback}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right Column: Reliability, Verification, Privacy & Shortcuts */}
          <aside className="lg:col-span-5 space-y-4">
            <ReliabilityProfileCard
              breakdown={userReliability}
              onOpenModal={() => setReliabilityModalOpen(true)}
            />

            {/* Verification Status Card */}
            <div className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="h-5 w-5 text-[#21866F] dark:text-[#34D399]" />
                  <h3 className="font-display text-base font-bold">Verificare profil</h3>
                </div>
                {user.verificationStatus === 'verified' && <VerifiedBadge showLabel />}
              </div>

              {user.verificationStatus === 'verified' ? (
                <p className="text-xs leading-relaxed text-[#717680] dark:text-[#9CA3AF]">
                  Identitatea ta a fost verificată. Insigna de profil verificat este vizibilă în descoperire, conversații și liste de activități.
                </p>
              ) : user.verificationStatus === 'pending' ? (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#F26B82]">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>Verificare în așteptare</span>
                  </div>
                  <p className="text-xs leading-relaxed text-[#717680] dark:text-[#9CA3AF]">
                    Fotografia ta cu gest este stocată în coada privată și așteaptă aprobarea unui administrator.
                  </p>
                  {isServerAdmin && (
                    <button
                      type="button"
                      onClick={() => setSubView('moderation')}
                      className="min-h-[40px] px-3.5 rounded-xl bg-[#F3F3F1] dark:bg-[#22242A] text-xs font-semibold"
                    >
                      Deschide coada de moderare
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs leading-relaxed text-[#717680] dark:text-[#9CA3AF]">
                    {user.verificationStatus === 'rejected'
                      ? user.verificationNote ||
                        'Cererea anterioară a fost respinsă. Încearcă din nou într-un loc bine luminat.'
                      : 'Confirmă printr-o fotografie rapidă cu gest că ești o persoană reală. Fotografia nu apare pe profilul public.'}
                  </p>
                  <button
                    type="button"
                    onClick={openVerificationModal}
                    className="w-full min-h-[44px] px-4 rounded-2xl bg-[#21866F] hover:opacity-95 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-opacity"
                  >
                    <BadgeCheck className="h-4 w-4" />
                    <span>
                      {user.verificationStatus === 'rejected'
                        ? 'Retrimite verificarea'
                        : 'Verifică-ți profilul'}
                    </span>
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-5 space-y-4">
              <h3 className="font-display text-base font-bold">
                Reconfirmări, confidențialitate & preferințe
              </h3>

              <label className="flex items-center justify-between gap-3 cursor-pointer min-h-[44px]">
                <span className="text-sm">Solicită reconfirmare cu 24h înainte</span>
                <input
                  type="checkbox"
                  checked={user.reconfirmationSettings.enabled}
                  onChange={(e) =>
                    updateReconfirmationSettings({ enabled: e.target.checked })
                  }
                  className="h-5 w-5 accent-[#21866F]"
                />
              </label>

              <label className="flex items-center justify-between gap-3 cursor-pointer min-h-[44px]">
                <span className="text-sm">Un reminder suplimentar dacă nu răspund</span>
                <input
                  type="checkbox"
                  checked={user.reconfirmationSettings.sendFollowUpReminder}
                  onChange={(e) =>
                    updateReconfirmationSettings({ sendFollowUpReminder: e.target.checked })
                  }
                  className="h-5 w-5 accent-[#21866F]"
                />
              </label>

              <label className="flex items-center justify-between gap-3 cursor-pointer min-h-[44px]">
                <span className="text-sm">Arată profilul meu în descoperire</span>
                <input
                  type="checkbox"
                  checked={user.discoveryPreferences.showMeInDiscovery}
                  onChange={(e) =>
                    updateDiscoveryPrefs({ showMeInDiscovery: e.target.checked })
                  }
                  className="h-5 w-5 accent-[#F26B82]"
                />
              </label>

              <label className="flex items-center justify-between gap-3 cursor-pointer min-h-[44px]">
                <span className="text-sm">Arată numele meu în lista activităților</span>
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

              <div className="pt-2 border-t border-[#E9E9EC] dark:border-[#272930] flex items-start gap-2 text-xs text-[#717680] dark:text-[#9CA3AF]">
                <Lock className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Adresa ta de e-mail ({user.email}) și istoricul detaliat al prezențelor nu sunt afișate public.
                </span>
              </div>
            </div>

            <div className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] divide-y divide-[#E9E9EC] dark:divide-[#272930] overflow-hidden">
              <button
                type="button"
                onClick={() => setSubView('plans')}
                className="w-full px-5 min-h-[56px] flex items-center justify-between text-left hover:bg-[#FAFAF9] dark:hover:bg-[#22242A]"
              >
                <span className="flex items-center gap-3 text-sm font-medium">
                  <Calendar className="h-4 w-4 text-[#F26B82]" />
                  <span>Planurile mele ({upcomingCount} viitoare)</span>
                </span>
                <ChevronRight className="h-4 w-4 text-[#717680]" />
              </button>

              <button
                type="button"
                onClick={() => setScreen('safety')}
                className="w-full px-5 min-h-[56px] flex items-center justify-between text-left hover:bg-[#FAFAF9] dark:hover:bg-[#22242A]"
              >
                <span className="flex items-center gap-3 text-sm font-medium">
                  <Shield className="h-4 w-4 text-[#21866F] dark:text-[#34D399]" />
                  <span>Centru de siguranță</span>
                </span>
                <ChevronRight className="h-4 w-4 text-[#717680]" />
              </button>

              <button
                type="button"
                onClick={startOnboarding}
                className="w-full px-5 min-h-[56px] flex items-center justify-between text-left hover:bg-[#FAFAF9] dark:hover:bg-[#22242A]"
              >
                <span className="flex items-center gap-3 text-sm font-medium">
                  <Compass className="h-4 w-4 text-[#F26B82]" />
                  <span>Reia turul de bun venit (Onboarding)</span>
                </span>
                <ChevronRight className="h-4 w-4 text-[#717680]" />
              </button>

              <button
                type="button"
                onClick={() => setScreen('settings')}
                className="w-full px-5 min-h-[56px] flex items-center justify-between text-left hover:bg-[#FAFAF9] dark:hover:bg-[#22242A]"
              >
                <span className="flex items-center gap-3 text-sm font-medium">
                  <Settings className="h-4 w-4 text-[#717680]" />
                  <span>Setări cont și aplicație</span>
                </span>
                <ChevronRight className="h-4 w-4 text-[#717680]" />
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Owner-only Reliability Breakdown & Dispute Modal */}
      <ReliabilityTransparencyModal
        open={reliabilityModalOpen}
        breakdown={userReliability}
        onClose={() => setReliabilityModalOpen(false)}
        onSubmitDispute={submitDispute}
      />

      {/* Edit Profile Modal */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSaveProfile}
            className="w-full sm:max-w-lg max-h-[88dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Editează profilul</h2>
              <button
                type="button"
                onClick={() => setEditing(false)}
                aria-label="Închide"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#717680] mb-1">Nume</label>
                <input
                  type="text"
                  required
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#717680] mb-1">
                  Vârstă (18+)
                </label>
                <input
                  type="number"
                  min={18}
                  max={99}
                  required
                  value={ageDraft}
                  onChange={(e) => setAgeDraft(Number(e.target.value) || 18)}
                  className="w-full min-h-[44px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3 text-sm tabular-nums"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#717680] mb-1">Oraș</label>
                <select
                  value={cityDraft}
                  onChange={(e) => setCityDraft(e.target.value as RomanianCity)}
                  className="w-full min-h-[44px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3 text-sm"
                >
                  {ROMANIAN_CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#717680] mb-1">Ocupație</label>
                <input
                  type="text"
                  value={occupationDraft}
                  onChange={(e) => setOccupationDraft(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#717680] mb-1">Biografie</label>
              <textarea
                rows={3}
                value={bioDraft}
                onChange={(e) => setBioDraft(e.target.value)}
                className="w-full rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#717680] mb-1">
                Interese (separate prin virgulă)
              </label>
              <input
                type="text"
                value={interestsDraft}
                onChange={(e) => setInterestsDraft(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3 text-sm"
              />
            </div>

            <div>
              <span className="block text-xs font-medium text-[#717680] mb-1.5">
                Preferințe activități
              </span>
              <div className="flex flex-wrap gap-2">
                {ALL_CATEGORIES.map((cat) => {
                  const active = prefsDraft.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategoryPref(cat)}
                      className={`min-h-[38px] px-3.5 rounded-xl text-xs font-medium border ${
                        active
                          ? 'bg-[#18191D] text-white border-[#18191D] dark:bg-white dark:text-[#18191D]'
                          : 'border-[#E9E9EC] dark:border-[#272930]'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="min-h-[44px] px-4 rounded-xl bg-[#F3F3F1] dark:bg-[#22242A] text-sm font-medium"
              >
                Anulează
              </button>
              <button
                type="submit"
                disabled={savingProfile}
                className="min-h-[44px] px-5 rounded-xl bg-[#F26B82] disabled:opacity-60 text-white text-sm font-semibold"
              >
                {savingProfile ? 'Se salvează...' : 'Salvează modificările'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
