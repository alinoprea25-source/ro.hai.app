'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  Calendar,
  Clock,
  Edit3,
  Flag,
  KeyRound,
  Lock,
  MapPin,
  MessageCircle,
  MessageSquare,
  Reply,
  Send,
  Share2,
  Sparkles,
  Star,
  Trash2,
  Users,
} from 'lucide-react';
import { useHai } from '@/components/HaiContext';
import { HaiImage } from '@/components/HaiImage';
import { ReliabilityInlineLabel } from '@/components/ReliabilityBadge';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { authorizedFetch } from '@/lib/api-client';
import type { ActivityComment, ActivityReview } from '@/types/hai';

export function ActivityDetailScreen() {
  const {
    activities,
    selectedActivityId,
    setScreen,
    savedActivityIds,
    toggleSaveActivity,
    joinOrLeaveActivity,
    joinWaitlistOrActivity,
    waitlistEntries,
    waitlistOffers,
    respondWaitlistOffer,
    submitGroupCheckIn,
    user,
    isAuthenticated,
    openReportModal,
    openConversationWithPartner,
    showToast,
    allProfiles,
    publicReliabilities,
    fetchPublicReliability,
  } = useHai();

  const activity = activities.find((a) => a.id === selectedActivityId) ?? activities[0];

  const [comments, setComments] = useState<ActivityComment[]>([]);
  const [commentsTotal, setCommentsTotal] = useState(0);
  const [commentsHasMore, setCommentsHasMore] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsRestricted, setCommentsRestricted] = useState<string | null>(null);
  const [commentPage, setCommentPage] = useState(1);

  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<ActivityComment | null>(null);
  const [replyText, setReplyText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');

  const [reviews, setReviews] = useState<ActivityReview[]>([]);
  const [reviewEligible, setReviewEligible] = useState(false);
  const [reviewEligibilityNote, setReviewEligibilityNote] = useState<string | undefined>();
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewOrgScore, setReviewOrgScore] = useState<number>(5);
  const [reviewAccScore, setReviewAccScore] = useState<number>(5);
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editReviewText, setEditReviewText] = useState('');

  const [checkInInput, setCheckInInput] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const activityId = activity?.id;
  const organizerId = activity?.organizerId;

  const loadComments = useCallback(
    async (pageNum = 1) => {
      if (!activityId || !isAuthenticated) return;
      setCommentsLoading(true);
      setCommentsRestricted(null);
      try {
        const res = await authorizedFetch(
          `/api/activities/${encodeURIComponent(activityId)}/comments?page=${pageNum}&pageSize=6`
        );
        const data = await res.json();
        if (res.status === 403) {
          setCommentsRestricted(data.error || 'Comentarii restricționate participanților.');
          setComments([]);
        } else if (res.ok) {
          setComments(data.comments || []);
          setCommentsTotal(data.total || 0);
          setCommentsHasMore(Boolean(data.hasMore));
        }
      } catch {
        // Ignore transient failure
      } finally {
        setCommentsLoading(false);
      }
    },
    [activityId, isAuthenticated]
  );

  const loadReviews = useCallback(async () => {
    if (!activityId || !isAuthenticated) return;
    try {
      const res = await authorizedFetch(
        `/api/activities/${encodeURIComponent(activityId)}/reviews`
      );
      if (!res.ok) return;
      const data = await res.json();
      setReviews(data.reviews || []);
      setReviewEligible(Boolean(data.eligibility?.eligible));
      setReviewEligibilityNote(data.eligibility?.reason);
    } catch {
      // Ignore transient failure
    }
  }, [activityId, isAuthenticated]);

  useEffect(() => {
    if (!activityId || !isAuthenticated) return;
    let active = true;
    if (organizerId) {
      void fetchPublicReliability(organizerId);
    }
    Promise.all([
      authorizedFetch(
        `/api/activities/${encodeURIComponent(activityId)}/comments?page=${commentPage}&pageSize=6`
      ).then(async (res) => ({ status: res.status, ok: res.ok, data: await res.json() })),
      authorizedFetch(
        `/api/activities/${encodeURIComponent(activityId)}/reviews`
      ).then(async (res) => ({ ok: res.ok, data: await res.json() })),
    ])
      .then(([cRes, rRes]) => {
        if (!active) return;
        if (cRes.status === 403) {
          setCommentsRestricted(cRes.data.error || 'Comentarii restricționate participanților.');
          setComments([]);
        } else if (cRes.ok) {
          setCommentsRestricted(null);
          setComments(cRes.data.comments || []);
          setCommentsTotal(cRes.data.total || 0);
          setCommentsHasMore(Boolean(cRes.data.hasMore));
        }
        if (rRes.ok) {
          setReviews(rRes.data.reviews || []);
          setReviewEligible(Boolean(rRes.data.eligibility?.eligible));
          setReviewEligibilityNote(rRes.data.eligibility?.reason);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [activityId, commentPage, fetchPublicReliability, isAuthenticated, organizerId]);

  if (!activity) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-[#717680]">Activitatea nu a fost găsită.</p>
        <button
          type="button"
          onClick={() => setScreen('main')}
          className="mt-4 min-h-[44px] px-5 rounded-xl bg-[#18191D] text-white text-sm font-semibold"
        >
          Înapoi
        </button>
      </div>
    );
  }

  const isSaved = savedActivityIds.includes(activity.id);
  const isJoined = activity.participants.some((p) => p.id === user.id);
  const isOrganizer = activity.organizerId === user.id;
  const pendingOffersCount = waitlistOffers.filter(
    (o) => o.activityId === activity.id && o.status === 'PENDING'
  ).length;
  const spotsLeft = Math.max(
    0,
    activity.maxParticipants - activity.participants.length - pendingOffersCount
  );
  const fillPercent = Math.min(
    100,
    Math.round(((activity.participants.length + pendingOffersCount) / activity.maxParticipants) * 100)
  );

  const organizerReliability = publicReliabilities[activity.organizerId];
  const activityWaitlist = waitlistEntries.filter(
    (e) =>
      e.activityId === activity.id &&
      (e.status === 'WAITING' || e.status === 'OFFERED')
  );
  const myWaitlistEntry = activityWaitlist.find((e) => e.userId === user.id);
  const myPendingOffer = waitlistOffers.find(
    (o) => o.activityId === activity.id && o.userId === user.id && o.status === 'PENDING'
  );

  const topLevelComments = comments.filter((c) => !c.parentId);
  const repliesByParent = new Map<string, ActivityComment[]>();
  for (const c of comments) {
    if (c.parentId) {
      const arr = repliesByParent.get(c.parentId) ?? [];
      arr.push(c);
      repliesByParent.set(c.parentId, arr);
    }
  }

  const handleShare = async () => {
    const shareText = `${activity.title} — ${activity.dateLabel}, ${activity.time} în ${activity.city} (HAI.)`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: activity.title, text: shareText });
        return;
      } catch {
        // User cancelled
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(shareText);
      showToast('Detaliile activității au fost copiate în clipboard.', 'success');
    }
  };

  const handleContactOrganizer = () => {
    const organizerProfile = allProfiles.find((p) => p.id === activity.organizerId);
    openConversationWithPartner({
      id: activity.organizerId,
      name: activity.organizerName,
      age: organizerProfile?.age ?? 28,
      city: activity.city,
      photoKey: activity.organizerPhotoKey,
    });
  };

  const handlePostComment = async (e: React.FormEvent, parentId?: string) => {
    e.preventDefault();
    const content = parentId ? replyText : newComment;
    if (content.trim().length < 2) {
      showToast('Scrie cel puțin 2 caractere.', 'error');
      return;
    }
    setSubmittingAction(true);
    try {
      const res = await authorizedFetch(
        `/api/activities/${encodeURIComponent(activity.id)}/comments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            authorName: user.name,
            authorPhotoKey: user.photoKey,
            authorCustomPhotoUrl: user.customPhotoUrl,
            content,
            parentId,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Nu am putut publica comentariul.', 'error');
      } else {
        if (parentId) {
          setReplyingTo(null);
          setReplyText('');
        } else {
          setNewComment('');
        }
        await loadComments(commentPage);
        showToast('Comentariu publicat.', 'success');
      }
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleSaveCommentEdit = async (commentId: string) => {
    const res = await authorizedFetch(
      `/api/activities/${encodeURIComponent(activity.id)}/comments`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId,
          content: editCommentText,
        }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Nu am putut edita comentariul.', 'error');
      return;
    }
    setEditingCommentId(null);
    setEditCommentText('');
    await loadComments(commentPage);
    showToast('Comentariu actualizat.', 'success');
  };

  const handleDeleteComment = async (commentId: string) => {
    const res = await authorizedFetch(
      `/api/activities/${encodeURIComponent(activity.id)}/comments?commentId=${encodeURIComponent(
        commentId
      )}`,
      { method: 'DELETE' }
    );
    if (res.ok) {
      await loadComments(commentPage);
      showToast('Comentariu șters.');
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAction(true);
    try {
      const res = await authorizedFetch(
        `/api/activities/${encodeURIComponent(activity.id)}/reviews`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            authorName: user.name,
            authorPhotoKey: user.photoKey,
            rating: reviewRating,
            categories: {
              organization: reviewOrgScore,
              accuracy: reviewAccScore,
              overall: reviewRating,
            },
            feedback: reviewFeedback,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Nu am putut trimite recenzia.', 'error');
      } else {
        setReviewFeedback('');
        await loadReviews();
        showToast('Recenzie verificată publicată!', 'success');
      }
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleSaveReviewEdit = async (reviewId: string) => {
    const res = await authorizedFetch(
      `/api/activities/${encodeURIComponent(activity.id)}/reviews`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId,
          feedback: editReviewText,
        }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Nu am putut actualiza recenzia.', 'error');
      return;
    }
    setEditingReviewId(null);
    setEditReviewText('');
    await loadReviews();
    showToast('Recenzie actualizată.', 'success');
  };

  return (
    <div className="min-h-dvh bg-[#FAFAF9] dark:bg-[#0E0F12] text-[#18191D] dark:text-[#F5F5F4] pb-[calc(112px+env(safe-area-inset-bottom,0px))]">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-[#FAFAF9]/88 dark:bg-[#0E0F12]/88 backdrop-blur-md border-b border-[#E9E9EC] dark:border-[#272930]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setScreen('main')}
            className="min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center rounded-full hover:bg-[#F3F3F1] dark:hover:bg-[#22242A]"
            aria-label="Înapoi la activități"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <p className="text-sm font-semibold truncate">{activity.title}</p>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => toggleSaveActivity(activity.id)}
              aria-label={isSaved ? 'Elimină din salvate' : 'Salvează activitatea'}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-[#F3F3F1] dark:hover:bg-[#22242A]"
            >
              <Bookmark className={`h-5 w-5 ${isSaved ? 'fill-current text-[#F26B82]' : ''}`} />
            </button>
            <button
              type="button"
              onClick={handleShare}
              aria-label="Distribuie activitatea"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-[#F3F3F1] dark:hover:bg-[#22242A]"
            >
              <Share2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-5 space-y-6">
        {/* Hero Image */}
        <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full rounded-3xl overflow-hidden border border-[#E9E9EC] dark:border-[#272930]">
          <HaiImage
            photoKey={activity.photoKey}
            customUrl={activity.customImageUrl}
            alt={activity.title}
            fill
            priority
            sizes="(max-width: 896px) 100vw, 896px"
          />
        </div>

        {/* Title & Organizer with Reliability */}
        <section className="space-y-2">
          <p className="text-xs font-medium text-[#717680] dark:text-[#9CA3AF]">
            {activity.category} · {activity.city}
            {activity.isEnded ? ' · Activitate încheiată' : ''} · Mod demonstrativ
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-balance">
            {activity.title}
          </h1>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative h-11 w-11 rounded-full overflow-hidden border border-[#E9E9EC] dark:border-[#272930]">
                <HaiImage
                  photoKey={activity.organizerPhotoKey}
                  customUrl={isOrganizer ? user.customPhotoUrl : undefined}
                  alt={activity.organizerName}
                  fill
                  sizes="44px"
                />
              </div>
              <div>
                <p className="text-sm font-semibold inline-flex items-center gap-1.5">
                  <span>{activity.organizerName}</span>
                  {(activity.organizerVerified || (isOrganizer && user.verificationStatus === 'verified')) && (
                    <VerifiedBadge showLabel />
                  )}
                </p>
                <div className="mt-0.5">
                  <ReliabilityInlineLabel summary={organizerReliability} compact />
                </div>
              </div>
            </div>

            {!isOrganizer && (
              <button
                type="button"
                onClick={handleContactOrganizer}
                className="min-h-[44px] px-4 rounded-xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] text-xs font-semibold flex items-center gap-1.5 hover:bg-[#F3F3F1] dark:hover:bg-[#22242A]"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Contactează</span>
              </button>
            )}
          </div>
        </section>

        {/* Active Waitlist Offer Banner */}
        {myPendingOffer && (
          <section className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#21866F] p-5 space-y-3">
            <div className="flex items-start gap-2.5">
              <Sparkles className="h-5 w-5 text-[#21866F] dark:text-[#34D399] shrink-0 mt-0.5" />
              <div>
                <h2 className="font-display text-base font-bold">
                  Ai primit un loc de pe lista de așteptare!
                </h2>
                <p className="mt-1 text-xs text-[#717680] dark:text-[#9CA3AF] tabular-nums">
                  Confirmă explicit până la{' '}
                  {new Date(myPendingOffer.expiresAt).toLocaleTimeString('ro-RO', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  altfel locul trece automat la următoarea persoană eligibilă.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void respondWaitlistOffer(myPendingOffer.id, 'ACCEPT')}
                className="min-h-[44px] px-5 rounded-xl bg-[#21866F] text-white text-xs font-semibold"
              >
                Acceptă locul acum
              </button>
              <button
                type="button"
                onClick={() => void respondWaitlistOffer(myPendingOffer.id, 'DECLINE')}
                className="min-h-[44px] px-4 rounded-xl bg-[#F3F3F1] dark:bg-[#22242A] text-xs font-semibold"
              >
                Refuză
              </button>
            </div>
          </section>
        )}

        {/* Key Logistics */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-5">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-[#F26B82] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-[#717680] dark:text-[#9CA3AF]">Data și ora</p>
              <p className="text-sm font-semibold tabular-nums">
                {activity.dateLabel}, {activity.time}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-[#F26B82] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-[#717680] dark:text-[#9CA3AF]">Zonă de întâlnire</p>
              <p className="text-sm font-semibold">
                {activity.city} · {activity.location}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Users className="h-5 w-5 text-[#F26B82] shrink-0 mt-0.5" />
            <div className="w-full">
              <p className="text-xs text-[#717680] dark:text-[#9CA3AF]">Capacitate & Listă de așteptare</p>
              <p className="text-sm font-semibold tabular-nums">
                {activity.participants.length} din {activity.maxParticipants} participanți (
                {spotsLeft === 0 ? 'complet' : `${spotsLeft} locuri libere`})
              </p>
              {activityWaitlist.length > 0 && (
                <p className="mt-0.5 text-xs text-[#717680] tabular-nums">
                  {activityWaitlist.length} persoane pe lista de așteptare
                  {myWaitlistEntry ? ` · Poziția ta: #${myWaitlistEntry.position}` : ''}
                </p>
              )}
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-[#F3F3F1] dark:bg-[#22242A] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#21866F] transition-all"
                  style={{ width: `${fillPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-[#F26B82] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-[#717680] dark:text-[#9CA3AF]">Cost și politică reconfirmare</p>
              <p className="text-sm font-semibold tabular-nums">
                {activity.priceLei ? `${activity.priceLei} lei / persoană` : 'Gratuit'} ·{' '}
                {activity.requiresApproval ? 'Cu aprobare' : 'Confirmare imediată'}
              </p>
              {activity.autoReleaseWaitlistSpot && (
                <p className="mt-0.5 text-[11px] text-[#717680]">
                  Locurile nereconfirmate până la termen pot trece pe lista de așteptare.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Voluntary Group Check-In */}
        {isJoined && !activity.isEnded && !activity.isCancelled && (
          <section className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-5 space-y-3">
            <h2 className="font-display text-base font-bold inline-flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-[#21866F] dark:text-[#34D399]" />
              <span>Check-in voluntar la punctul de întâlnire</span>
            </h2>
            <p className="text-xs text-[#717680] dark:text-[#9CA3AF]">
              Confirmarea prezenței prin cod scurt contribuie la punctajul tău de fiabilitate (fără urmărire GPS continuă).
              {activity.checkInCode ? ` Cod demonstrativ: ${activity.checkInCode}.` : ''}
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await submitGroupCheckIn(activity.id, checkInInput);
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                maxLength={10}
                value={checkInInput}
                onChange={(e) => setCheckInInput(e.target.value.toUpperCase())}
                placeholder="Introdu codul activității"
                className="flex-1 min-h-[44px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3.5 text-sm uppercase tabular-nums"
              />
              <button
                type="submit"
                className="min-h-[44px] px-5 rounded-xl bg-[#21866F] text-white text-xs font-semibold"
              >
                Confirmă prezența
              </button>
            </form>
          </section>
        )}

        {/* Description */}
        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">Despre activitate</h2>
          <p className="text-sm sm:text-base leading-relaxed text-[#717680] dark:text-[#9CA3AF]">
            {activity.description}
          </p>
        </section>

        {/* Participants */}
        <section className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-5">
          <h2 className="font-display text-base font-bold">
            Participanți ({activity.participants.length})
          </h2>

          {activity.privacyShowParticipants ? (
            <div className="mt-3 flex flex-wrap gap-3">
              {activity.participants.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <div className="relative h-9 w-9 rounded-full overflow-hidden border border-[#E9E9EC] dark:border-[#272930]">
                    <HaiImage
                      photoKey={p.photoKey}
                      customUrl={p.customPhotoUrl}
                      alt={p.name}
                      fill
                      sizes="36px"
                    />
                  </div>
                  <span className="text-sm font-medium inline-flex items-center gap-1">
                    <span>{p.name}</span>
                    {p.isVerified && <VerifiedBadge />}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2.5 flex items-center gap-2 text-xs text-[#717680] dark:text-[#9CA3AF]">
              <Lock className="h-4 w-4 shrink-0" />
              <span>
                Lista nominală a participanților este privată conform setărilor organizatorului.
              </span>
            </div>
          )}
        </section>

        {/* Pre-event Q&A Comments */}
        <section className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-base font-bold inline-flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-[#F26B82]" />
              <span>Comentarii și întrebări ({commentsTotal})</span>
            </h2>
          </div>

          {commentsRestricted ? (
            <div className="flex items-center gap-2 text-xs text-[#717680] dark:text-[#9CA3AF]">
              <Lock className="h-4 w-4 shrink-0" />
              <span>{commentsRestricted}</span>
            </div>
          ) : (
            <>
              <form onSubmit={(e) => void handlePostComment(e)} className="flex gap-2">
                <input
                  type="text"
                  maxLength={500}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Pune o întrebare despre echipament, punctul de întâlnire sau ritm..."
                  className="flex-1 min-h-[44px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3.5 text-sm"
                />
                <button
                  type="submit"
                  disabled={submittingAction}
                  aria-label="Publică comentariul"
                  className="min-h-[44px] px-4 rounded-xl bg-[#18191D] dark:bg-white text-white dark:text-[#18191D] text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Trimite</span>
                </button>
              </form>

              {commentsLoading && comments.length === 0 ? (
                <p className="text-xs text-[#717680]">Se încarcă comentariile...</p>
              ) : topLevelComments.length === 0 ? (
                <p className="text-xs text-[#717680] dark:text-[#9CA3AF]">
                  Încă nu sunt comentarii. Pune prima întrebare către organizator sau grup!
                </p>
              ) : (
                <div className="space-y-4">
                  {topLevelComments.map((cmt) => {
                    const replies = repliesByParent.get(cmt.id) ?? [];
                    const isMine = cmt.authorId === user.id;

                    return (
                      <div
                        key={cmt.id}
                        className="border-t border-[#E9E9EC] dark:border-[#272930] pt-3.5 space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative h-8 w-8 rounded-full overflow-hidden shrink-0 border border-[#E9E9EC] dark:border-[#272930]">
                              <HaiImage
                                photoKey={cmt.authorPhotoKey}
                                customUrl={cmt.authorCustomPhotoUrl}
                                alt={cmt.authorName}
                                fill
                                sizes="32px"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold inline-flex items-center gap-1.5 flex-wrap">
                                <span>{cmt.authorName}</span>
                                {cmt.authorVerified && <VerifiedBadge />}
                                <span
                                  className={`font-medium ${
                                    cmt.authorRole === 'Organizator'
                                      ? 'text-[#F26B82]'
                                      : 'text-[#717680]'
                                  }`}
                                >
                                  · {cmt.authorRole}
                                </span>
                                <span className="font-normal text-[#717680] tabular-nums">
                                  · {new Date(cmt.createdAt).toLocaleString('ro-RO', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                  {cmt.updatedAt ? ' (editat)' : ''}
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>

                        {editingCommentId === cmt.id ? (
                          <div className="flex items-center gap-2 pl-10">
                            <input
                              type="text"
                              value={editCommentText}
                              onChange={(e) => setEditCommentText(e.target.value)}
                              className="flex-1 min-h-[40px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3 text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => void handleSaveCommentEdit(cmt.id)}
                              className="min-h-[40px] px-3 rounded-xl bg-[#21866F] text-white text-xs font-semibold"
                            >
                              Salvează
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCommentId(null)}
                              className="min-h-[40px] px-3 rounded-xl bg-[#F3F3F1] dark:bg-[#22242A] text-xs"
                            >
                              Renunță
                            </button>
                          </div>
                        ) : (
                          <p className="text-sm leading-relaxed pl-10">{cmt.content}</p>
                        )}

                        <div className="pl-10 flex flex-wrap items-center gap-3 text-xs text-[#717680]">
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingTo(cmt);
                              setReplyText('');
                            }}
                            className="inline-flex items-center gap-1 hover:text-[#18191D] dark:hover:text-white min-h-[34px]"
                          >
                            <Reply className="h-3.5 w-3.5" />
                            <span>Răspunde</span>
                          </button>

                          {isMine && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCommentId(cmt.id);
                                  setEditCommentText(cmt.content);
                                }}
                                className="inline-flex items-center gap-1 hover:text-[#18191D] min-h-[34px]"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                                <span>Editează</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteComment(cmt.id)}
                                className="inline-flex items-center gap-1 text-red-600 min-h-[34px]"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Șterge</span>
                              </button>
                            </>
                          )}

                          {!isMine && (
                            <button
                              type="button"
                              onClick={() =>
                                openReportModal({
                                  targetType: 'comment',
                                  targetId: cmt.id,
                                  targetTitle: `Comentariu de la ${cmt.authorName}`,
                                })
                              }
                              className="inline-flex items-center gap-1 hover:text-red-600 min-h-[34px]"
                            >
                              <Flag className="h-3.5 w-3.5" />
                              <span>Raportează</span>
                            </button>
                          )}
                        </div>

                        {/* One-level Replies */}
                        {replies.length > 0 && (
                          <div className="pl-10 space-y-2.5">
                            {replies.map((rep) => (
                              <div
                                key={rep.id}
                                className="rounded-2xl bg-[#FAFAF9] dark:bg-[#0E0F12] border border-[#E9E9EC] dark:border-[#272930] p-3 space-y-1"
                              >
                                <p className="text-xs font-semibold inline-flex items-center gap-1.5 flex-wrap">
                                  <span>{rep.authorName}</span>
                                  {rep.authorVerified && <VerifiedBadge />}
                                  <span
                                    className={`font-medium ${
                                      rep.authorRole === 'Organizator'
                                        ? 'text-[#F26B82]'
                                        : 'text-[#717680]'
                                    }`}
                                  >
                                    · {rep.authorRole}
                                  </span>
                                </p>
                                <p className="text-xs leading-relaxed text-[#717680] dark:text-[#9CA3AF]">
                                  {rep.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        {replyingTo?.id === cmt.id && (
                          <form
                            onSubmit={(e) => void handlePostComment(e, cmt.id)}
                            className="pl-10 flex gap-2"
                          >
                            <input
                              type="text"
                              maxLength={500}
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder={`Răspunde lui ${cmt.authorName}...`}
                              className="flex-1 min-h-[40px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3 text-xs"
                            />
                            <button
                              type="submit"
                              className="min-h-[40px] px-3.5 rounded-xl bg-[#21866F] text-white text-xs font-semibold"
                            >
                              Trimite
                            </button>
                          </form>
                        )}
                      </div>
                    );
                  })}

                  {commentsHasMore && (
                    <button
                      type="button"
                      onClick={() => setCommentPage((p) => p + 1)}
                      className="min-h-[40px] px-4 rounded-xl bg-[#F3F3F1] dark:bg-[#22242A] text-xs font-semibold"
                    >
                      Încarcă mai multe comentarii
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </section>

        {/* Verified Post-Event Reviews */}
        <section className="rounded-3xl bg-white dark:bg-[#18191D] border border-[#E9E9EC] dark:border-[#272930] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-base font-bold inline-flex items-center gap-2">
              <Star className="h-4 w-4 text-[#F26B82]" />
              <span>Recenzii de la participanți ({reviews.length})</span>
            </h2>
            <span className="text-[11px] text-[#717680]">
              Doar participanți cu prezență verificată
            </span>
          </div>

          {reviewEligible && (
            <form
              onSubmit={handleSubmitReview}
              className="rounded-2xl bg-[#FAFAF9] dark:bg-[#0E0F12] border border-[#E9E9EC] dark:border-[#272930] p-4 space-y-3"
            >
              <p className="text-xs font-semibold text-[#21866F] dark:text-[#34D399]">
                Prezența ta la această activitate este verificată — lasă o recenzie onestă:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs tabular-nums">
                <div>
                  <label className="block text-[#717680] mb-1">Evaluare generală (1–5)</label>
                  <select
                    value={reviewRating}
                    onChange={(e) => setReviewRating(Number(e.target.value))}
                    className="w-full min-h-[40px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-white dark:bg-[#18191D] px-2.5"
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} / 5 stele
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#717680] mb-1">Organizare</label>
                  <select
                    value={reviewOrgScore}
                    onChange={(e) => setReviewOrgScore(Number(e.target.value))}
                    className="w-full min-h-[40px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-white dark:bg-[#18191D] px-2.5"
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} / 5
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#717680] mb-1">Acuratețe detalii</label>
                  <select
                    value={reviewAccScore}
                    onChange={(e) => setReviewAccScore(Number(e.target.value))}
                    className="w-full min-h-[40px] rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-white dark:bg-[#18191D] px-2.5"
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} / 5
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <textarea
                rows={3}
                required
                minLength={10}
                maxLength={600}
                value={reviewFeedback}
                onChange={(e) => setReviewFeedback(e.target.value)}
                placeholder="Cum a fost atmosfera, punctualitatea și organizarea?"
                className="w-full rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-white dark:bg-[#18191D] px-3 py-2 text-xs"
              />

              <button
                type="submit"
                disabled={submittingAction}
                className="min-h-[42px] px-5 rounded-xl bg-[#21866F] text-white text-xs font-semibold disabled:opacity-50"
              >
                Publică recenzia verificată
              </button>
            </form>
          )}

          {!reviewEligible && reviewEligibilityNote && activity.isEnded && (
            <p className="text-xs text-[#717680] dark:text-[#9CA3AF]">
              {reviewEligibilityNote}
            </p>
          )}

          {reviews.length === 0 ? (
            <p className="text-xs text-[#717680] dark:text-[#9CA3AF]">
              {activity.isEnded
                ? 'Încă nu există recenzii scrise pentru această activitate.'
                : 'Recenziile devin disponibile după încheierea activității, exclusiv pentru participanții cu prezență verificată.'}
            </p>
          ) : (
            <div className="divide-y divide-[#E9E9EC] dark:divide-[#272930]">
              {reviews.map((rev) => {
                const isAuthor = rev.authorId === user.id;
                return (
                  <div key={rev.id} className="py-3.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold inline-flex items-center gap-1.5">
                        <span>{rev.authorName}</span>
                        {rev.authorVerified && <VerifiedBadge />}
                        <span className="text-[#21866F] dark:text-[#34D399] font-medium">
                          · Prezență verificată
                        </span>
                      </p>
                      {rev.rating && (
                        <span className="text-xs font-semibold tabular-nums inline-flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-current text-[#F26B82]" />
                          <span>{rev.rating}/5</span>
                        </span>
                      )}
                    </div>

                    {editingReviewId === rev.id ? (
                      <div className="space-y-2 pt-1">
                        <textarea
                          rows={2}
                          value={editReviewText}
                          onChange={(e) => setEditReviewText(e.target.value)}
                          className="w-full rounded-xl border border-[#E9E9EC] dark:border-[#272930] bg-[#FAFAF9] dark:bg-[#0E0F12] px-3 py-2 text-xs"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => void handleSaveReviewEdit(rev.id)}
                            className="min-h-[36px] px-3 rounded-lg bg-[#21866F] text-white text-xs font-semibold"
                          >
                            Salvează
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingReviewId(null)}
                            className="min-h-[36px] px-3 rounded-lg bg-[#F3F3F1] dark:bg-[#22242A] text-xs"
                          >
                            Renunță
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed text-[#717680] dark:text-[#9CA3AF]">
                        {rev.feedback}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-[#717680]">
                      {isAuthor && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingReviewId(rev.id);
                            setEditReviewText(rev.feedback);
                          }}
                          className="inline-flex items-center gap-1 hover:text-[#18191D] min-h-[32px]"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Editează recenzia mea</span>
                        </button>
                      )}
                      {!isAuthor && (
                        <button
                          type="button"
                          onClick={() =>
                            openReportModal({
                              targetType: 'review',
                              targetId: rev.id,
                              targetTitle: `Recenzie de la ${rev.authorName}`,
                            })
                          }
                          className="inline-flex items-center gap-1 hover:text-red-600 min-h-[32px]"
                        >
                          <Flag className="h-3.5 w-3.5" />
                          <span>Raportează</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Rules & Reporting */}
        <section className="space-y-3">
          <h2 className="font-display text-base font-bold">Regulile grupului</h2>
          <ul className="space-y-1.5 text-sm text-[#717680] dark:text-[#9CA3AF] list-disc pl-5">
            {activity.rules.map((rule, idx) => (
              <li key={idx}>{rule}</li>
            ))}
          </ul>

          <div className="pt-2">
            <button
              type="button"
              onClick={() =>
                openReportModal({
                  targetType: 'activity',
                  targetId: activity.id,
                  targetTitle: activity.title,
                })
              }
              className="min-h-[44px] inline-flex items-center gap-2 text-xs font-medium text-[#717680] hover:text-red-600 transition-colors"
            >
              <Flag className="h-4 w-4" />
              <span>Raportează această activitate</span>
            </button>
          </div>
        </section>
      </main>

      {/* Sticky Bottom Participation / Waitlist Bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 bg-white/92 dark:bg-[#18191D]/92 backdrop-blur-md border-t border-[#E9E9EC] dark:border-[#272930] px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))]">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="tabular-nums">
            <p className="text-sm font-bold">
              {activity.priceLei ? `${activity.priceLei} lei` : 'Gratuit'}
            </p>
            <p className="text-xs text-[#717680] dark:text-[#9CA3AF]">
              {activity.isEnded
                ? 'Activitate încheiată'
                : spotsLeft === 0
                ? myWaitlistEntry
                  ? `Pe lista de așteptare (#${myWaitlistEntry.position})`
                  : 'Complet · Listă de așteptare activă'
                : `${spotsLeft} locuri disponibile`}
            </p>
          </div>

          {activity.isEnded ? (
            <span className="min-h-[48px] px-6 rounded-2xl bg-[#F3F3F1] dark:bg-[#22242A] text-xs font-semibold inline-flex items-center">
              Încheiată
            </span>
          ) : (
            <button
              type="button"
              disabled={isOrganizer}
              onClick={() => {
                if (!isJoined && spotsLeft === 0) {
                  void joinWaitlistOrActivity(activity.id);
                } else {
                  joinOrLeaveActivity(activity.id);
                }
              }}
              className={`min-h-[48px] px-7 rounded-2xl text-sm font-semibold transition-colors disabled:opacity-60 ${
                isOrganizer
                  ? 'bg-[#F3F3F1] dark:bg-[#22242A] text-[#18191D] dark:text-[#F5F5F4]'
                  : isJoined
                  ? 'bg-[#18191D] dark:bg-white text-white dark:text-[#18191D]'
                  : spotsLeft === 0
                  ? 'bg-[#21866F] hover:opacity-95 text-white'
                  : 'bg-[#F26B82] hover:bg-[#E2556E] text-white'
              }`}
            >
              {isOrganizer
                ? 'Ești organizatorul'
                : isJoined
                ? 'Anulează participarea'
                : myPendingOffer
                ? 'Acceptă locul oferit'
                : myWaitlistEntry
                ? `Pe listă (#${myWaitlistEntry.position})`
                : spotsLeft === 0
                ? 'Intră pe lista de așteptare'
                : 'Participă'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
