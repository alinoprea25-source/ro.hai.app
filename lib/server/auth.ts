import { getApp, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { NextRequest, NextResponse } from 'next/server';
import firebaseConfig from '@/firebase-applet-config.json';

export interface AuthenticatedUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  isClaimAdmin: boolean;
  idToken: string;
}

const BOOTSTRAP_ADMIN_EMAIL = 'revenueanatomy.media@gmail.com';

export function isValidFirebaseUid(uid: unknown): uid is string {
  return typeof uid === 'string' && /^[A-Za-z0-9_-]{3,128}$/.test(uid);
}

export function getFirebaseAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  if (!match) return null;
  const token = match[1].trim();
  if (!token || token.length > 8192) return null;
  return token;
}

export async function verifyFirebaseBearerToken(
  authHeader: string | null
): Promise<AuthenticatedUser | null> {
  const idToken = extractBearerToken(authHeader);
  if (!idToken) return null;

  try {
    const adminApp = getFirebaseAdminApp();
    const decoded: DecodedIdToken = await getAuth(adminApp).verifyIdToken(idToken);
    if (!isValidFirebaseUid(decoded.uid)) return null;

    const email =
      typeof decoded.email === 'string' ? decoded.email.trim().toLowerCase() : null;
    const emailVerified = Boolean(decoded.email_verified);
    const name =
      typeof decoded.name === 'string' && decoded.name.trim().length > 0
        ? decoded.name.trim().slice(0, 80)
        : null;
    const isClaimAdmin =
      decoded.admin === true ||
      decoded.role === 'admin' ||
      decoded.role === 'moderator';

    return {
      uid: decoded.uid,
      email,
      emailVerified,
      name,
      isClaimAdmin,
      idToken,
    };
  } catch {
    return null;
  }
}

export async function requireAuth(
  req: NextRequest
): Promise<
  | { ok: true; user: AuthenticatedUser }
  | { ok: false; response: NextResponse }
> {
  const user = await verifyFirebaseBearerToken(req.headers.get('authorization'));
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Autentificare necesară. Token invalid, expirat sau lipsă.' },
        { status: 401 }
      ),
    };
  }
  return { ok: true, user };
}

function getAllowedAdminEmails(): Set<string> {
  const emails = new Set<string>([BOOTSTRAP_ADMIN_EMAIL]);
  const envRaw = process.env.HAI_ADMIN_EMAILS?.trim();
  if (envRaw) {
    for (const part of envRaw.split(',')) {
      const normalized = part.trim().toLowerCase();
      if (normalized) emails.add(normalized);
    }
  }
  return emails;
}

async function hasFirestoreAdminDocument(user: AuthenticatedUser): Promise<boolean> {
  const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    firebaseConfig.projectId
  )}/databases/${encodeURIComponent(databaseId)}/documents/admins/${encodeURIComponent(
    user.uid
  )}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${user.idToken}`,
      },
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function isAuthorizedAdmin(user: AuthenticatedUser): Promise<boolean> {
  if (!user.emailVerified) {
    return false;
  }
  if (user.isClaimAdmin) {
    return true;
  }
  if (user.email && getAllowedAdminEmails().has(user.email)) {
    return true;
  }
  return hasFirestoreAdminDocument(user);
}

export async function requireAdmin(
  req: NextRequest
): Promise<
  | { ok: true; user: AuthenticatedUser }
  | { ok: false; response: NextResponse }
> {
  const authResult = await requireAuth(req);
  if (!authResult.ok) {
    return authResult;
  }

  const isAdmin = await isAuthorizedAdmin(authResult.user);
  if (!isAdmin) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Acces restricționat. Necesită rol de administrator verificat.' },
        { status: 403 }
      ),
    };
  }

  return { ok: true, user: authResult.user };
}
