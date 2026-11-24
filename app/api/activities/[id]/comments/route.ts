import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedAdmin, requireAuth } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { sanitizePlainText } from '@/lib/server/validation';
import {
  addActivityComment,
  deleteActivityComment,
  editActivityComment,
  getCommentsForActivity,
  getTrustStore,
  isPlanParticipant,
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
  const page = Number(req.nextUrl.searchParams.get('page') || 1);
  const pageSize = Number(req.nextUrl.searchParams.get('pageSize') || 6);

  const res = getCommentsForActivity({
    activityId: id,
    viewerId: user.uid,
    page: Number.isFinite(page) ? page : 1,
    pageSize: Number.isFinite(pageSize) ? pageSize : 6,
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: res.error },
      { status: res.statusCode ?? 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    mode: 'demo',
    comments: res.comments,
    total: res.total,
    hasMore: res.hasMore,
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
  const rate = checkRateLimit(`comments:${user.uid}`, 12, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: `Ai trimis prea multe comentarii într-un interval scurt. Încearcă peste ${rate.retryAfterSeconds}s.`,
      },
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

  const res = await addActivityComment({
    activityId: id,
    authorId,
    authorName,
    authorPhotoKey: (body.authorPhotoKey as PhotoKey) || 'andrei',
    authorCustomPhotoUrl:
      typeof body.authorCustomPhotoUrl === 'string' ? body.authorCustomPhotoUrl : undefined,
    authorVerified: serverVerified,
    content: sanitizePlainText(body.content, 500),
    parentId: body.parentId ? sanitizePlainText(body.parentId, 80) : undefined,
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: res.error },
      { status: res.statusCode ?? 400 }
    );
  }

  const store = getTrustStore();
  const userPlanIds = new Set(
    store.plans.filter((p) => isPlanParticipant(p, authorId)).map((p) => p.id)
  );
  const scopedNotifications = store.notifications
    .filter((n) => {
      if (n.userId) return n.userId === authorId;
      if (n.planId) return userPlanIds.has(n.planId);
      return !n.activityId || n.activityId === id;
    })
    .slice(0, 10);

  return NextResponse.json({
    ok: true,
    mode: 'demo',
    comment: res.comment,
    notifications: scopedNotifications,
  });
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

  const commentId = sanitizePlainText(body.commentId, 80);
  const content = sanitizePlainText(body.content, 500);

  const res = await editActivityComment({
    activityId: id,
    commentId,
    actorId: user.uid,
    content,
  });
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.statusCode ?? 400 });
  }
  return NextResponse.json({ ok: true, mode: 'demo', comment: res.comment });
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(req);
  if (!authResult.ok) {
    return authResult.response;
  }
  const { user } = authResult;
  const { id } = await context.params;

  const commentId = sanitizePlainText(req.nextUrl.searchParams.get('commentId'), 80);
  const isModerator = await isAuthorizedAdmin(user);

  const res = await deleteActivityComment({
    activityId: id,
    commentId,
    actorId: user.uid,
    isModerator,
  });
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.statusCode ?? 400 });
  }
  return NextResponse.json({ ok: true, mode: 'demo' });
}
