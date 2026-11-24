import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedAdmin, requireAuth } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { sanitizePlainText } from '@/lib/server/validation';
import {
  expireWaitlistOffersForActivity,
  getTrustStore,
  isPlanParticipant,
  joinActivityOrWaitlist,
  respondToWaitlistOffer,
} from '@/lib/server/trust-store';
import { getVerificationStatusForUser } from '@/lib/server/verification-store';
import type { PhotoKey } from '@/types/hai';

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (!authResult.ok) {
    return authResult.response;
  }
  const { user } = authResult;
  const isAdmin = await isAuthorizedAdmin(user);

  const activityId = sanitizePlainText(req.nextUrl.searchParams.get('activityId'), 80);
  const store = getTrustStore();

  if (activityId) {
    const activity = store.activities.find((a) => a.id === activityId);
    if (!activity) {
      return NextResponse.json({ error: 'Activitatea nu a fost găsită.' }, { status: 404 });
    }
    await expireWaitlistOffersForActivity(activityId);
    const canSeeAll = isAdmin || activity.organizerId === user.uid;
    const entries = store.waitlistEntries
      .filter((e) => e.activityId === activityId && (canSeeAll || e.userId === user.uid))
      .sort((a, b) => a.position - b.position);
    const offers = store.waitlistOffers.filter(
      (o) => o.activityId === activityId && (canSeeAll || o.userId === user.uid)
    );
    return NextResponse.json({
      ok: true,
      mode: 'demo',
      activity,
      entries,
      offers,
    });
  }

  const entries = isAdmin
    ? store.waitlistEntries
    : store.waitlistEntries.filter((e) => e.userId === user.uid);
  const offers = isAdmin
    ? store.waitlistOffers
    : store.waitlistOffers.filter((o) => o.userId === user.uid);

  return NextResponse.json({
    ok: true,
    mode: 'demo',
    entries,
    offers,
  });
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (!authResult.ok) {
    return authResult.response;
  }
  const { user } = authResult;

  const rate = checkRateLimit(`waitlist:${user.uid}`, 25, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: `Prea multe cereri pentru lista de așteptare. Încearcă peste ${rate.retryAfterSeconds}s.` },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalid.' }, { status: 400 });
  }

  const action = String(body.action || '');
  const userId = user.uid;
  const userName =
    sanitizePlainText(body.userName || user.name || 'Membru HAI', 80) || 'Membru HAI';
  const isAdmin = await isAuthorizedAdmin(user);

  if (action === 'join') {
    const activityId = sanitizePlainText(body.activityId, 80);
    if (!activityId) {
      return NextResponse.json({ error: 'Lipsește identificatorul activității.' }, { status: 400 });
    }
    const serverVerified = getVerificationStatusForUser(userId).status === 'verified';
    const result = await joinActivityOrWaitlist({
      activityId,
      userId,
      userName,
      photoKey: (body.photoKey as PhotoKey) || 'andrei',
      isVerified: serverVerified,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    const store = getTrustStore();
    const canSeeAll = isAdmin || result.activity?.organizerId === userId;
    return NextResponse.json({
      ok: true,
      mode: 'demo',
      resultMode: result.mode,
      activity: result.activity,
      waitlistEntry: result.waitlistEntry,
      entries: store.waitlistEntries.filter(
        (e) => e.activityId === activityId && (canSeeAll || e.userId === userId)
      ),
      offers: store.waitlistOffers.filter(
        (o) => o.activityId === activityId && (canSeeAll || o.userId === userId)
      ),
    });
  }

  if (action === 'accept_offer' || action === 'decline_offer') {
    const offerId = sanitizePlainText(body.offerId, 80);
    if (!offerId) {
      return NextResponse.json({ error: 'Lipsește identificatorul ofertei.' }, { status: 400 });
    }
    const result = await respondToWaitlistOffer({
      offerId,
      userId,
      decision: action === 'accept_offer' ? 'ACCEPT' : 'DECLINE',
      now: new Date(),
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.statusCode ?? 400 }
      );
    }
    const store = getTrustStore();
    const actId = result.activity?.id;
    const canSeeAll = isAdmin || result.activity?.organizerId === userId;
    const myPlanIds = new Set(
      store.plans.filter((p) => isPlanParticipant(p, userId)).map((p) => p.id)
    );
    return NextResponse.json({
      ok: true,
      mode: 'demo',
      activity: result.activity,
      offer: result.offer,
      nextOfferedUser: canSeeAll ? result.nextOfferedUser : undefined,
      entries: actId
        ? store.waitlistEntries.filter(
            (e) => e.activityId === actId && (canSeeAll || e.userId === userId)
          )
        : [],
      offers: actId
        ? store.waitlistOffers.filter(
            (o) => o.activityId === actId && (canSeeAll || o.userId === userId)
          )
        : [],
      notifications: store.notifications
        .filter((n) => (n.userId ? n.userId === userId : n.planId ? myPlanIds.has(n.planId) : false))
        .slice(0, 12),
    });
  }

  if (action === 'expire_stale') {
    const activityId = sanitizePlainText(body.activityId, 80);
    if (!activityId) {
      return NextResponse.json({ error: 'Lipsește identificatorul activității.' }, { status: 400 });
    }
    const store = getTrustStore();
    const activity = store.activities.find((a) => a.id === activityId);
    if (!activity) {
      return NextResponse.json({ error: 'Activitatea nu a fost găsită.' }, { status: 404 });
    }
    const isInvolved =
      isAdmin ||
      activity.organizerId === userId ||
      activity.participants.some((p) => p.id === userId) ||
      store.waitlistEntries.some((e) => e.activityId === activityId && e.userId === userId);
    if (!isInvolved) {
      return NextResponse.json(
        { error: 'Acces restricționat pentru această activitate.' },
        { status: 403 }
      );
    }

    const now =
      isAdmin && body.simulatedNowIso ? new Date(String(body.simulatedNowIso)) : new Date();
    const res = await expireWaitlistOffersForActivity(activityId, now);
    const canSeeAll = isAdmin || activity.organizerId === userId;
    return NextResponse.json({
      ok: true,
      mode: 'demo',
      expired: res.expired,
      nextOffer:
        res.nextOffer && (canSeeAll || res.nextOffer.userId === userId)
          ? res.nextOffer
          : null,
      entries: store.waitlistEntries.filter(
        (e) => e.activityId === activityId && (canSeeAll || e.userId === userId)
      ),
      offers: store.waitlistOffers.filter(
        (o) => o.activityId === activityId && (canSeeAll || o.userId === userId)
      ),
    });
  }

  return NextResponse.json({ error: 'Acțiune necunoscută pentru lista de așteptare.' }, { status: 400 });
}
