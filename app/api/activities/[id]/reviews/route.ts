import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { sanitizePlainText } from '@/lib/server/validation';
import {
  canUserReviewActivity,
  editActivityReview,
  getReviewsForActivity,
  getReviewsForOrganizer,
  submitActivityReview,
} from '@/lib/server/trust-store';
import { getVerificationStatusForUser } from '@/lib/server/verification-store';
import type { PhotoKey } from '@/types/hai';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(req);
  if (!authResult.ok) {
    return authResult.response;
  }
  const { user } = authResult;

  const { id } = await context.params;
  const organizerId = req.nextUrl.searchParams.get('organizerId');

  if (organizerId) {
    return NextResponse.json({
      ok: true,
      mode: 'demo',
      reviews: getReviewsForOrganizer(sanitizePlainText(organizerId, 80)),
    });
  }

  const eligibility = canUserReviewActivity(id, user.uid);
  return NextResponse.json({
    ok: true,
    mode: 'demo',
    reviews: getReviewsForActivity(id, user.uid),
    eligibility,
  });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(req);
  if (!authResult.ok) {
    return authResult.response;
  }
  const { user } = authResult;

  const { id } = await context.params;
  const rate = checkRateLimit(`reviews:${user.uid}`, 8, 60_000);
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

  const authorId = user.uid;
  const authorName =
    sanitizePlainText(body.authorName || user.name || 'Membru HAI', 80) || 'Membru HAI';
  const serverVerified = getVerificationStatusForUser(authorId).status === 'verified';

  const res = await submitActivityReview({
    activityId: id,
    authorId,
    authorName,
    authorPhotoKey: (body.authorPhotoKey as PhotoKey) || 'andrei',
    authorVerified: serverVerified,
    rating: body.rating !== undefined && body.rating !== null ? Number(body.rating) : undefined,
    categories:
      body.categories && typeof body.categories === 'object'
        ? (body.categories as { organization?: number; accuracy?: number; overall?: number })
        : undefined,
    feedback: sanitizePlainText(body.feedback, 600),
  });

  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.statusCode ?? 400 });
  }

  return NextResponse.json({ ok: true, mode: 'demo', review: res.review });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(req);
  if (!authResult.ok) {
    return authResult.response;
  }
  const { user } = authResult;
  const { id } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalid.' }, { status: 400 });
  }

  const reviewId = sanitizePlainText(body.reviewId, 80);

  const res = await editActivityReview({
    activityId: id,
    reviewId,
    actorId: user.uid,
    rating: body.rating !== undefined && body.rating !== null ? Number(body.rating) : undefined,
    categories:
      body.categories && typeof body.categories === 'object'
        ? (body.categories as { organization?: number; accuracy?: number; overall?: number })
        : undefined,
    feedback: sanitizePlainText(body.feedback, 600),
  });

  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.statusCode ?? 400 });
  }

  return NextResponse.json({ ok: true, mode: 'demo', review: res.review });
}
