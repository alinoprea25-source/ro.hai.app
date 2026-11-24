import { NextRequest, NextResponse } from 'next/server';
import {
  applyRevenueCatWebhookEvent,
  verifyRevenueCatWebhookSecret,
} from '@/lib/server/subscription-store';

export async function POST(req: NextRequest) {
  if (!process.env.REVENUECAT_WEBHOOK_SECRET?.trim()) {
    return NextResponse.json(
      { error: 'Webhook-ul RevenueCat nu este configurat pe server.' },
      { status: 503 }
    );
  }

  if (!verifyRevenueCatWebhookSecret(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Autorizare webhook invalidă.' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Corp JSON invalid.' }, { status: 400 });
  }

  const snapshot = applyRevenueCatWebhookEvent(
    body as Parameters<typeof applyRevenueCatWebhookEvent>[0]
  );

  if (!snapshot) {
    return NextResponse.json(
      { ok: true, ignored: true, reason: 'Identificator app_user_id lipsă sau invalid.' },
      { status: 200 }
    );
  }

  return NextResponse.json({ ok: true, subscription: snapshot }, { status: 200 });
}
