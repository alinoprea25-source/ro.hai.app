import { NextResponse } from 'next/server';
import { getFirebaseReadiness } from '@/lib/firebase-config';

export async function GET() {
  const status = getFirebaseReadiness();
  return NextResponse.json({
    ok: true,
    app: 'HAI.',
    ...status,
    timestamp: new Date().toISOString(),
  });
}
