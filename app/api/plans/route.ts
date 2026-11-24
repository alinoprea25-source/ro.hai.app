import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedAdmin, requireAuth } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { sanitizePlainText } from '@/lib/server/validation';
import {
  cancelPlanWithTrustPolicy,
  confirmPlanParticipant,
  createPlanRecord,
  evaluateReconfirmationReminders,
  getTrustStore,
  handleSafetyBlockTransition,
  isPlanParticipant,
  proposePlanChange,
  respondToPlanProposal,
} from '@/lib/server/trust-store';
import type {
  NotificationItem,
  PhotoKey,
  PlanChangeProposal,
  PlanItem,
  PlanProposedSlot,
  RomanianCity,
} from '@/types/hai';

function filterNotificationsForUser(
  notifications: NotificationItem[],
  userId: string
): NotificationItem[] {
  const store = getTrustStore();
  const myPlanIds = new Set(
    store.plans.filter((p) => isPlanParticipant(p, userId)).map((p) => p.id)
  );
  const myActivityIds = new Set(
    store.activities
      .filter(
        (a) =>
          a.organizerId === userId || a.participants.some((pt) => pt.id === userId)
      )
      .map((a) => a.id)
  );

  return notifications.filter((n) => {
    if (n.userId) return n.userId === userId;
    if (n.planId) return myPlanIds.has(n.planId);
    if (n.activityId) return myActivityIds.has(n.activityId);
    return false;
  });
}

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (!authResult.ok) {
    return authResult.response;
  }
  const { user } = authResult;
  const isAdmin = await isAuthorizedAdmin(user);

  const store = getTrustStore();
  const planId = sanitizePlainText(req.nextUrl.searchParams.get('planId'), 80);

  if (planId) {
    const plan = store.plans.find((p) => p.id === planId);
    if (!plan) {
      return NextResponse.json({ error: 'Planul nu a fost găsit.' }, { status: 404 });
    }
    if (!isAdmin && !isPlanParticipant(plan, user.uid)) {
      return NextResponse.json(
        { error: 'Acces restricționat. Nu ești participant la acest plan.' },
        { status: 403 }
      );
    }
    return NextResponse.json({
      ok: true,
      mode: 'demo',
      plan,
      proposals: store.planProposals.filter((pr) => pr.planId === planId),
      events: store.planStatusEvents.filter((ev) => ev.planId === planId),
    });
  }

  const myPlans = store.plans.filter((p) => isPlanParticipant(p, user.uid));
  const myPlanIds = new Set(myPlans.map((p) => p.id));

  return NextResponse.json({
    ok: true,
    mode: 'demo',
    plans: myPlans,
    proposals: store.planProposals.filter((pr) => myPlanIds.has(pr.planId)),
    events: store.planStatusEvents.filter((ev) => myPlanIds.has(ev.planId)),
    notifications: filterNotificationsForUser(store.notifications, user.uid),
  });
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (!authResult.ok) {
    return authResult.response;
  }
  const { user } = authResult;

  const rate = checkRateLimit(`plans:${user.uid}`, 30, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: `Prea multe acțiuni. Încearcă peste ${rate.retryAfterSeconds}s.` },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corpul cererii este invalid.' }, { status: 400 });
  }

  const action = String(body.action || '');
  const userId = user.uid;
  const userName =
    sanitizePlainText(body.userName || user.name || 'Membru HAI', 80) || 'Membru HAI';

  if (action === 'create_plan') {
    const title = sanitizePlainText(body.title, 100);
    const location = sanitizePlainText(body.location, 140);
    const time = sanitizePlainText(body.time, 5);
    const dateLabel = sanitizePlainText(body.dateLabel, 40);
    if (title.length < 3 || location.length < 3 || !/^\d{2}:\d{2}$/.test(time)) {
      return NextResponse.json(
        { error: 'Titlul, ora (HH:MM) și locația planului sunt obligatorii.' },
        { status: 400 }
      );
    }

    const plan = await createPlanRecord({
      type: (body.type as PlanItem['type']) || 'meetup',
      activityId: body.activityId ? sanitizePlainText(body.activityId, 80) : undefined,
      title,
      dateLabel: dateLabel || 'Sâmbătă',
      isoDate: body.isoDate ? sanitizePlainText(body.isoDate, 10) : undefined,
      time,
      city: (body.city as RomanianCity) || 'Cluj-Napoca',
      location,
      photoKey: (body.photoKey as PhotoKey) || 'coffee',
      creatorId: userId,
      creatorName: userName,
      creatorPhotoKey: (body.creatorPhotoKey as PhotoKey) || 'andrei',
      partnerId: body.partnerId ? sanitizePlainText(body.partnerId, 80) : undefined,
      partnerName: body.partnerName ? sanitizePlainText(body.partnerName, 80) : undefined,
      partnerPhotoKey: body.partnerPhotoKey as PhotoKey | undefined,
      autoConfirm: Boolean(body.autoConfirm),
    });

    const store = getTrustStore();
    return NextResponse.json({
      ok: true,
      mode: 'demo',
      plan,
      notifications: filterNotificationsForUser(store.notifications, userId).slice(0, 12),
      events: store.planStatusEvents.filter((e) => e.planId === plan.id),
    });
  }

  if (action === 'confirm' || action === 'reconfirm') {
    const planId = sanitizePlainText(body.planId, 80);
    if (!planId) {
      return NextResponse.json({ error: 'Identificatorul planului lipsește.' }, { status: 400 });
    }
    const result = await confirmPlanParticipant({
      planId,
      userId,
      userName,
      mode: action === 'reconfirm' ? 'reconfirm' : 'confirm',
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.statusCode ?? 400 }
      );
    }
    const store = getTrustStore();
    return NextResponse.json({
      ok: true,
      mode: 'demo',
      plan: result.plan,
      notifications: filterNotificationsForUser(store.notifications, userId).slice(0, 12),
      events: store.planStatusEvents.filter((e) => e.planId === planId),
    });
  }

  if (action === 'propose_changes') {
    const planId = sanitizePlainText(body.planId, 80);
    const kind = (['day', 'time', 'location', 'mixed'].includes(String(body.kind))
      ? String(body.kind)
      : 'mixed') as PlanChangeProposal['kind'];
    const rawSlots = Array.isArray(body.slots) ? body.slots : [];
    const slots: PlanProposedSlot[] = rawSlots.slice(0, 3).map((s: Record<string, unknown>, idx) => ({
      id: sanitizePlainText(s.id || `slot-${Date.now()}-${idx}`, 60),
      dateLabel: sanitizePlainText(s.dateLabel || s.isoDate || 'Altă zi', 40),
      isoDate: sanitizePlainText(s.isoDate || '2026-12-01', 10),
      time: sanitizePlainText(s.time || '18:00', 5),
      location: sanitizePlainText(s.location || 'Cluj-Napoca', 120),
    }));

    if (slots.length === 0 || slots.some((sl) => !/^\d{2}:\d{2}$/.test(sl.time) || sl.location.length < 2)) {
      return NextResponse.json(
        { error: 'Adaugă între 1 și 3 opțiuni valide cu oră și locație.' },
        { status: 400 }
      );
    }

    const result = await proposePlanChange({
      planId,
      userId,
      userName,
      kind,
      slots,
      note: body.note ? sanitizePlainText(body.note, 240) : undefined,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.statusCode ?? 400 }
      );
    }
    const store = getTrustStore();
    return NextResponse.json({
      ok: true,
      mode: 'demo',
      proposal: result.proposal,
      plan: result.plan,
      notifications: filterNotificationsForUser(store.notifications, userId).slice(0, 12),
      events: store.planStatusEvents.filter((e) => e.planId === planId),
    });
  }

  if (action === 'respond_proposal') {
    const proposalId = sanitizePlainText(body.proposalId, 80);
    const decision = body.decision === 'ACCEPT' ? 'ACCEPT' : body.decision === 'REJECT' ? 'REJECT' : null;
    if (!proposalId || !decision) {
      return NextResponse.json({ error: 'Propunere sau decizie invalidă.' }, { status: 400 });
    }
    const result = await respondToPlanProposal({
      proposalId,
      userId,
      userName,
      decision,
      selectedSlotId: body.selectedSlotId ? sanitizePlainText(body.selectedSlotId, 60) : undefined,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.statusCode ?? 400 }
      );
    }
    const store = getTrustStore();
    return NextResponse.json({
      ok: true,
      mode: 'demo',
      proposal: result.proposal,
      plan: result.plan,
      notifications: filterNotificationsForUser(store.notifications, userId).slice(0, 12),
      events: result.plan ? store.planStatusEvents.filter((e) => e.planId === result.plan!.id) : [],
    });
  }

  if (action === 'cancel') {
    const planId = sanitizePlainText(body.planId, 80);
    if (!planId) {
      return NextResponse.json({ error: 'Identificatorul planului lipsește.' }, { status: 400 });
    }
    const result = await cancelPlanWithTrustPolicy({
      planId,
      userId,
      userName,
      safetyReason: Boolean(body.safetyReason),
      reasonText: body.reasonText ? sanitizePlainText(body.reasonText, 240) : undefined,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.statusCode ?? 400 }
      );
    }
    const store = getTrustStore();
    return NextResponse.json({
      ok: true,
      mode: 'demo',
      plan: result.plan,
      attendanceClassification: result.attendanceClassification,
      offeredWaitlistUser: result.offeredWaitlistUser,
      notifications: filterNotificationsForUser(store.notifications, userId).slice(0, 12),
      events: store.planStatusEvents.filter((e) => e.planId === planId),
    });
  }

  if (action === 'evaluate_reminders') {
    const isAdmin = await isAuthorizedAdmin(user);
    const now =
      isAdmin && body.simulatedNowIso ? new Date(String(body.simulatedNowIso)) : new Date();
    const res = evaluateReconfirmationReminders(
      now,
      isAdmin ? undefined : { filterUserId: userId }
    );
    const store = getTrustStore();
    const visiblePlans = isAdmin
      ? store.plans
      : store.plans.filter((p) => isPlanParticipant(p, userId));
    return NextResponse.json({
      ok: true,
      mode: 'demo',
      ...res,
      plans: visiblePlans,
      notifications: filterNotificationsForUser(store.notifications, userId).slice(0, 15),
    });
  }

  if (action === 'safe_block_transition') {
    const blockedUserId = sanitizePlainText(body.blockedUserId, 80);
    const blockedUserName = sanitizePlainText(body.blockedUserName || 'Utilizator', 80);
    if (!blockedUserId) {
      return NextResponse.json({ error: 'Utilizator invalid.' }, { status: 400 });
    }
    const res = await handleSafetyBlockTransition({
      viewerId: userId,
      blockedUserId,
      blockedUserName,
    });
    return NextResponse.json({ ok: true, mode: 'demo', ...res });
  }

  return NextResponse.json({ error: 'Acțiune necunoscută pentru planuri.' }, { status: 400 });
}
