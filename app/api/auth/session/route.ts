import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedAdmin, requireAuth } from '@/lib/server/auth';

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (!authResult.ok) {
    return authResult.response;
  }

  const isAdmin = await isAuthorizedAdmin(authResult.user);
  return NextResponse.json({
    ok: true,
    uid: authResult.user.uid,
    email: authResult.user.email,
    emailVerified: authResult.user.emailVerified,
    isAdmin,
  });
}
