import { NextRequest, NextResponse } from 'next/server';
import { POSE_CHALLENGES } from '@/lib/constants/verification';
import { isAuthorizedAdmin, requireAdmin, requireAuth } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { sanitizePlainText } from '@/lib/server/validation';
import {
  getVerificationStatusForUser,
  listVerificationSubmissionsForAdmin,
  reviewVerificationSubmission,
  saveVerificationSubmission,
} from '@/lib/server/verification-store';

const ALLOWED_IMAGE_DATA_URL_REGEX =
  /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/;

const MAX_DATA_URL_LENGTH = 3_600_000; // ~2.6MB binary image max

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (!authResult.ok) {
    return authResult.response;
  }
  const { user } = authResult;

  const scope = req.nextUrl.searchParams.get('scope');
  const requestedUserId = sanitizePlainText(req.nextUrl.searchParams.get('userId'), 80);

  // Admin-only queue access (verification selfie photos accessible solely to verified admins)
  if (scope === 'admin') {
    const isAdmin = await isAuthorizedAdmin(user);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Acces restricționat. Doar administratorii autorizați pot vedea fotografiile de verificare.' },
        { status: 403 }
      );
    }
    const submissions = listVerificationSubmissionsForAdmin();
    return NextResponse.json({
      ok: true,
      mode: 'demo',
      persistedInFirebase: false,
      submissions,
    });
  }

  // Self-status check (never returns raw verification photo data)
  if (requestedUserId && requestedUserId !== user.uid) {
    const isAdmin = await isAuthorizedAdmin(user);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Nu poți accesa statusul de verificare al altui utilizator.' },
        { status: 403 }
      );
    }
  }

  const targetUserId = requestedUserId || user.uid;
  const result = getVerificationStatusForUser(targetUserId);
  return NextResponse.json({
    ok: true,
    mode: 'demo',
    ...result,
  });
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (!authResult.ok) {
    return authResult.response;
  }
  const { user } = authResult;

  const rate = checkRateLimit(`verification-submit:${user.uid}`, 5, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: `Prea multe încercări de verificare. Încearcă peste ${rate.retryAfterSeconds}s.`,
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
    return NextResponse.json({ error: 'Corp JSON invalid.' }, { status: 400 });
  }

  const userId = user.uid;
  const userName = sanitizePlainText(body.userName || user.name || 'Membru HAI', 60);
  const poseId = sanitizePlainText(body.poseId, 50);
  const photoDataUrl = typeof body.photoDataUrl === 'string' ? body.photoDataUrl.trim() : '';

  if (!userName) {
    return NextResponse.json(
      { error: 'Numele utilizatorului lipsește.' },
      { status: 400 }
    );
  }

  const pose = POSE_CHALLENGES.find((p) => p.id === poseId);
  if (!pose) {
    return NextResponse.json(
      { error: 'Provocarea de postură selectată nu este validă.' },
      { status: 400 }
    );
  }

  if (
    !photoDataUrl ||
    photoDataUrl.length > MAX_DATA_URL_LENGTH ||
    !ALLOWED_IMAGE_DATA_URL_REGEX.test(photoDataUrl)
  ) {
    return NextResponse.json(
      {
        error:
          'Imaginea de verificare trebuie să fie JPG, PNG sau WebP valid și să aibă cel mult 2.5 MB.',
      },
      { status: 400 }
    );
  }

  const submission = saveVerificationSubmission({
    id: `ver-${Date.now()}`,
    userId,
    userName,
    poseId: pose.id,
    poseInstruction: pose.instruction,
    photoDataUrl,
    status: 'pending',
    submittedAt: new Date().toISOString(),
  });

  // Never echo back the raw verification image in the user confirmation response
  return NextResponse.json({
    ok: true,
    mode: 'demo',
    persistedInFirebase: false,
    verification: {
      id: submission.id,
      status: submission.status,
      poseId: submission.poseId,
      submittedAt: submission.submittedAt,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const adminResult = await requireAdmin(req);
  if (!adminResult.ok) {
    return adminResult.response;
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cerere invalidă.' }, { status: 400 });
  }

  const submissionId = sanitizePlainText(body.submissionId, 80);
  const decision =
    body.decision === 'verified' || body.decision === 'rejected'
      ? body.decision
      : null;
  const reviewNote = sanitizePlainText(body.reviewNote, 200);

  if (!submissionId || !decision) {
    return NextResponse.json(
      { error: 'ID-ul cererii și decizia (verified / rejected) sunt obligatorii.' },
      { status: 400 }
    );
  }

  const updated = reviewVerificationSubmission(submissionId, decision, reviewNote);
  if (!updated) {
    return NextResponse.json(
      { error: 'Cererea de verificare nu a fost găsită.' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    mode: 'demo',
    submission: {
      id: updated.id,
      userId: updated.userId,
      status: updated.status,
      reviewNote: updated.reviewNote,
      reviewedAt: updated.reviewedAt,
    },
  });
}
