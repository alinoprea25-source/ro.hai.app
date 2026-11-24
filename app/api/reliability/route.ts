import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { sanitizePlainText } from '@/lib/server/validation';
import { getReliabilityForViewer } from '@/lib/server/trust-store';

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (!authResult.ok) {
    return authResult.response;
  }
  const { user } = authResult;

  const targetUserId =
    sanitizePlainText(req.nextUrl.searchParams.get('userId') || user.uid, 80) || user.uid;

  // Derive viewerId exclusively from verified Firebase ID token
  const result = getReliabilityForViewer(targetUserId, user.uid);

  if (result.isOwner && result.breakdown) {
    return NextResponse.json({
      ok: true,
      mode: 'demo',
      isOwner: true,
      summary: result.summary,
      breakdown: result.breakdown,
    });
  }

  // Strictly return ONLY public summary to other viewers (never raw attendance history)
  return NextResponse.json({
    ok: true,
    mode: 'demo',
    isOwner: false,
    summary: result.summary,
  });
}

// Explicitly forbid direct client-side reliability score manipulation
export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (!authResult.ok) {
    return authResult.response;
  }

  return NextResponse.json(
    {
      error:
        'Scorul de fiabilitate este calculat exclusiv pe server din istoricul de prezență și nu poate fi modificat direct.',
    },
    { status: 403 }
  );
}

export async function PATCH(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (!authResult.ok) {
    return authResult.response;
  }

  return NextResponse.json(
    {
      error:
        'Scorul de fiabilitate nu poate fi modificat manual de utilizatori sau organizatori.',
    },
    { status: 403 }
  );
}
