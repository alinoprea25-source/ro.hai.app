import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedAdmin, requireAdmin, requireAuth } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { sanitizePlainText, validateReportPayload } from '@/lib/server/validation';
import { getAggregateAnalytics, getTrustStore } from '@/lib/server/trust-store';
import type { SafetyReport } from '@/types/hai';

export async function GET(req: NextRequest) {
  const adminResult = await requireAdmin(req);
  if (!adminResult.ok) {
    return adminResult.response;
  }

  const store = getTrustStore();
  return NextResponse.json({
    ok: true,
    mode: 'demo',
    entries: store.reports.slice(0, 40),
    moderationActions: store.moderationActions.slice(0, 40),
    disputes: store.attendanceDisputes,
    analytics: getAggregateAnalytics(),
  });
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (!authResult.ok) {
    return authResult.response;
  }
  const { user } = authResult;

  const rate = checkRateLimit(`safety-report:${user.uid}`, 10, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: `Ai trimis prea multe raportări într-un interval scurt. Încearcă peste ${rate.retryAfterSeconds}s.`,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(rate.retryAfterSeconds) },
      }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cerere invalidă.' }, { status: 400 });
  }

  // Appeal submission by affected owner (or verified admin)
  if (body.action === 'appeal') {
    const reportId = sanitizePlainText(body.reportId, 80);
    const appealNote = sanitizePlainText(body.appealNote, 400);
    const store = getTrustStore();
    const rep = store.reports.find((r) => r.id === reportId);
    if (!rep) {
      return NextResponse.json({ error: 'Raportarea nu a fost găsită.' }, { status: 404 });
    }

    const isAdmin = await isAuthorizedAdmin(user);
    const isAffectedOwner =
      (rep.targetType === 'user' && rep.targetId === user.uid) ||
      (rep.targetType === 'comment' &&
        store.comments.find((c) => c.id === rep.targetId)?.authorId === user.uid) ||
      (rep.targetType === 'review' &&
        store.reviews.find((r) => r.id === rep.targetId)?.authorId === user.uid) ||
      (rep.targetType === 'activity' &&
        store.activities.find((a) => a.id === rep.targetId)?.organizerId === user.uid);

    if (!isAdmin && !isAffectedOwner) {
      return NextResponse.json(
        { error: 'Poți contesta doar o măsură aplicată conținutului sau profilului tău.' },
        { status: 403 }
      );
    }

    if (appealNote.length < 10) {
      return NextResponse.json(
        { error: 'Descrie motivul contestației în cel puțin 10 caractere.' },
        { status: 400 }
      );
    }
    rep.appealNote = appealNote;
    rep.appealStatus = 'PENDING';
    return NextResponse.json({ ok: true, mode: 'demo', report: rep });
  }

  const validation = validateReportPayload({
    targetType: body.targetType,
    targetId: body.targetId,
    targetTitle: body.targetTitle,
    reason: body.reason,
    details: body.details,
  });

  if (!validation.valid || !validation.sanitized) {
    return NextResponse.json(
      { error: validation.errors[0] || 'Raportare invalidă.', errors: validation.errors },
      { status: 400 }
    );
  }

  const store = getTrustStore();
  const entry: SafetyReport = {
    id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    reporterId: user.uid,
    ...validation.sanitized,
    createdAt: new Date().toISOString(),
    status: 'în analiză',
    appealStatus: 'NONE',
  };

  store.reports.unshift(entry);

  return NextResponse.json({
    ok: true,
    mode: 'demo',
    persistedInFirebase: false,
    report: entry,
  });
}

export async function PATCH(req: NextRequest) {
  const adminResult = await requireAdmin(req);
  if (!adminResult.ok) {
    return adminResult.response;
  }
  const { user } = adminResult;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalid.' }, { status: 400 });
  }

  const reportId = sanitizePlainText(body.reportId, 80);
  const decision = String(body.decision || '');
  const reason = sanitizePlainText(body.reason || 'Decizie moderare', 240);
  const store = getTrustStore();
  const report = store.reports.find((r) => r.id === reportId);
  if (!report) {
    return NextResponse.json({ error: 'Raportarea nu a fost găsită.' }, { status: 404 });
  }

  const now = new Date().toISOString();

  if (decision === 'REMOVE_CONTENT') {
    report.status = 'eliminat';
    if (report.targetType === 'comment') {
      const c = store.comments.find((cm) => cm.id === report.targetId);
      if (c) c.removedByModerator = true;
    } else if (report.targetType === 'review') {
      const rv = store.reviews.find((r) => r.id === report.targetId);
      if (rv) rv.removedByModerator = true;
    }
    store.moderationActions.unshift({
      id: `mod-${Date.now()}`,
      moderatorId: user.uid,
      targetType: report.targetType,
      targetId: report.targetId,
      action: 'REMOVED',
      reason,
      createdAt: now,
    });
  } else if (decision === 'GRANT_APPEAL') {
    report.status = 'respins';
    report.appealStatus = 'GRANTED';
    if (report.targetType === 'comment') {
      const c = store.comments.find((cm) => cm.id === report.targetId);
      if (c) c.removedByModerator = false;
    } else if (report.targetType === 'review') {
      const rv = store.reviews.find((r) => r.id === report.targetId);
      if (rv) rv.removedByModerator = false;
    }
    store.moderationActions.unshift({
      id: `mod-${Date.now()}`,
      moderatorId: user.uid,
      targetType: report.targetType,
      targetId: report.targetId,
      action: 'APPEAL_GRANTED',
      reason,
      createdAt: now,
    });
  } else {
    report.status = 'revizuit';
    store.moderationActions.unshift({
      id: `mod-${Date.now()}`,
      moderatorId: user.uid,
      targetType: report.targetType,
      targetId: report.targetId,
      action: 'DISMISSED_REPORT',
      reason,
      createdAt: now,
    });
  }

  return NextResponse.json({
    ok: true,
    mode: 'demo',
    report,
    moderationActions: store.moderationActions.slice(0, 40),
  });
}
