import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedAdmin, requireAuth } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { sanitizePlainText } from '@/lib/server/validation';
import {
  generateGroupCheckInCode,
  getTrustStore,
  organizerConfirmAttendance,
  resolveAttendanceDispute,
  submitAttendanceDispute,
  submitVoluntaryCheckIn,
} from '@/lib/server/trust-store';

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (!authResult.ok) {
    return authResult.response;
  }
  const { user } = authResult;
  const isAdmin = await isAuthorizedAdmin(user);

  const scope = req.nextUrl.searchParams.get('scope');
  const requestedUserId = sanitizePlainText(req.nextUrl.searchParams.get('userId'), 80);
  const store = getTrustStore();

  if (scope === 'admin') {
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Acces restricționat. Necesită autorizare administrativă.' },
        { status: 403 }
      );
    }
    return NextResponse.json({
      ok: true,
      mode: 'demo',
      disputes: store.attendanceDisputes,
      moderationActions: store.moderationActions,
    });
  }

  if (requestedUserId && requestedUserId !== user.uid && !isAdmin) {
    return NextResponse.json(
      { error: 'Nu poți accesa istoricul de prezență al altui utilizator.' },
      { status: 403 }
    );
  }

  const targetUserId = requestedUserId || user.uid;
  return NextResponse.json({
    ok: true,
    mode: 'demo',
    records: store.attendanceRecords.filter((r) => r.userId === targetUserId),
    disputes: store.attendanceDisputes.filter((d) => d.userId === targetUserId),
  });
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (!authResult.ok) {
    return authResult.response;
  }
  const { user } = authResult;

  const rate = checkRateLimit(`attendance:${user.uid}`, 25, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: `Prea multe încercări. Așteaptă ${rate.retryAfterSeconds}s.` },
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

  if (action === 'generate_code') {
    const activityId = sanitizePlainText(body.activityId, 80);
    const res = await generateGroupCheckInCode({ activityId, organizerId: userId });
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 403 });
    return NextResponse.json({ ok: true, mode: 'demo', code: res.code, expiresAt: res.expiresAt });
  }

  if (action === 'check_in_code') {
    const res = await submitVoluntaryCheckIn({
      activityId: body.activityId ? sanitizePlainText(body.activityId, 80) : undefined,
      planId: body.planId ? sanitizePlainText(body.planId, 80) : undefined,
      userId,
      code: body.code ? sanitizePlainText(body.code, 12) : undefined,
    });
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
    return NextResponse.json({ ok: true, mode: 'demo', record: res.record });
  }

  if (action === 'organizer_confirm') {
    const activityId = sanitizePlainText(body.activityId, 80);
    const targetUserId = sanitizePlainText(body.targetUserId, 80);
    const status =
      body.status === 'VERIFIED_NO_SHOW' ? 'VERIFIED_NO_SHOW' : 'VERIFIED_ATTENDANCE';
    const res = await organizerConfirmAttendance({
      activityId,
      organizerId: userId,
      targetUserId,
      status,
    });
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 403 });
    return NextResponse.json({ ok: true, mode: 'demo', record: res.record });
  }

  if (action === 'dispute_record') {
    const recordId = sanitizePlainText(body.recordId, 80);
    const reason = sanitizePlainText(body.reason, 400);
    const res = await submitAttendanceDispute({ recordId, userId, userName, reason });
    if (!res.ok) {
      return NextResponse.json(
        { error: res.error },
        { status: res.statusCode ?? 400 }
      );
    }
    return NextResponse.json({ ok: true, mode: 'demo', dispute: res.dispute });
  }

  if (action === 'resolve_dispute') {
    const isAdmin = await isAuthorizedAdmin(user);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Acces restricționat. Doar moderatorii autorizați pot soluționa contestațiile.' },
        { status: 403 }
      );
    }
    const disputeId = sanitizePlainText(body.disputeId, 80);
    const outcome =
      body.outcome === 'RESOLVED_EXCUSED' ? 'RESOLVED_EXCUSED' : 'RESOLVED_UPHELD';
    const moderatorNote = body.moderatorNote
      ? sanitizePlainText(body.moderatorNote, 300)
      : undefined;
    const res = await resolveAttendanceDispute({
      disputeId,
      moderatorId: user.uid,
      outcome,
      moderatorNote,
    });
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 404 });
    return NextResponse.json({ ok: true, mode: 'demo', dispute: res.dispute });
  }

  return NextResponse.json({ error: 'Acțiune necunoscută pentru prezență.' }, { status: 400 });
}
