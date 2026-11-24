import { auth } from '@/lib/firebase';

const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, '') || '';

export function resolveApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return configuredBaseUrl ? `${configuredBaseUrl}${normalizedPath}` : normalizedPath;
}

export async function getFirebaseAuthHeaders(
  extraHeaders?: HeadersInit
): Promise<Headers> {
  const headers = new Headers(extraHeaders);
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const idToken = await currentUser.getIdToken();
      if (idToken) {
        headers.set('Authorization', `Bearer ${idToken}`);
      }
    } catch {
      // If token retrieval fails, request proceeds without Authorization header and server rejects with 401
    }
  }
  return headers;
}

export async function authorizedFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const headers = await getFirebaseAuthHeaders(init.headers);
  return fetch(resolveApiUrl(path), {
    ...init,
    headers,
  });
}
