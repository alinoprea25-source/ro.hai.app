import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { fetchVerifiedRevenueCatStatus } from '@/lib/server/subscription-store';

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (!authResult.ok) {
    return authResult.response;
  }

  const snapshot = await fetchVerifiedRevenueCatStatus(authResult.user.uid);
  return NextResponse.json({
    uid: authResult.user.uid,
    subscription: snapshot,
  });
}
