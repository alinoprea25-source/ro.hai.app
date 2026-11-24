import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { validateActivityPayload } from '@/lib/server/validation';

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (!authResult.ok) {
    return authResult.response;
  }
  const { user } = authResult;

  const rate = checkRateLimit(`create-activity:${user.uid}`, 10, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: `Prea multe cereri. Încearcă din nou peste ${rate.retryAfterSeconds} secunde.`,
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
    return NextResponse.json(
      { error: 'Corpul cererii nu este un JSON valid.' },
      { status: 400 }
    );
  }

  const validation = validateActivityPayload({
    title: body.title,
    category: body.category,
    description: body.description,
    isoDate: body.isoDate,
    time: body.time,
    city: body.city,
    location: body.location,
    maxParticipants: body.maxParticipants,
    priceLei: body.priceLei,
    requiresApproval: body.requiresApproval,
  });

  if (!validation.valid || !validation.sanitized) {
    return NextResponse.json(
      { error: validation.errors[0] || 'Date invalide.', errors: validation.errors },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    mode: 'demo',
    persistedInFirebase: false,
    validatedActivity: {
      id: `act-demo-${Date.now()}`,
      organizerId: user.uid,
      ...validation.sanitized,
    },
  });
}
