import crypto from 'crypto';
import {
  isValidFirebaseUid,
  verifyFirebaseBearerToken,
} from '@/lib/server/auth';
import type { SubscriptionPlatform, SubscriptionStatusSnapshot } from '@/types/hai';

export { isValidFirebaseUid, verifyFirebaseBearerToken };

const DEFAULT_ENTITLEMENT_ID =
  process.env.NEXT_PUBLIC_REVENUECAT_ENTITLEMENT_ID?.trim() || 'hai_plus';

const globalForSubs = globalThis as typeof globalThis & {
  __haiWebhookSubscriptions?: Map<string, SubscriptionStatusSnapshot>;
};

function getWebhookStore(): Map<string, SubscriptionStatusSnapshot> {
  if (!globalForSubs.__haiWebhookSubscriptions) {
    globalForSubs.__haiWebhookSubscriptions = new Map();
  }
  return globalForSubs.__haiWebhookSubscriptions;
}

function mapStoreStringToPlatform(store: unknown): SubscriptionPlatform {
  if (typeof store !== 'string') return 'none';
  const normalized = store.toLowerCase();
  if (normalized.includes('play_store') || normalized.includes('android')) return 'android';
  if (normalized.includes('app_store') || normalized.includes('mac_app_store')) return 'ios';
  if (normalized.includes('stripe') || normalized.includes('rc_billing')) return 'web';
  return 'none';
}

export async function fetchVerifiedRevenueCatStatus(
  uid: string
): Promise<SubscriptionStatusSnapshot> {
  if (!isValidFirebaseUid(uid)) {
    return {
      tier: 'free',
      isActive: false,
      entitlementId: DEFAULT_ENTITLEMENT_ID,
      platform: 'none',
      willRenew: false,
      source: 'unconfigured',
    };
  }

  const secretApiKey = process.env.REVENUECAT_SECRET_API_KEY?.trim();
  if (secretApiKey) {
    try {
      const res = await fetch(
        `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(uid)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${secretApiKey}`,
            Accept: 'application/json',
          },
          cache: 'no-store',
        }
      );

      if (res.ok) {
        const data = (await res.json()) as {
          subscriber?: {
            management_url?: string | null;
            entitlements?: Record<
              string,
              {
                expires_date?: string | null;
                product_identifier?: string;
                purchase_date?: string;
              }
            >;
            subscriptions?: Record<
              string,
              {
                store?: string;
                unsubscribe_detected_at?: string | null;
                expires_date?: string | null;
              }
            >;
          };
        };

        const subscriber = data.subscriber;
        const ent =
          subscriber?.entitlements?.[DEFAULT_ENTITLEMENT_ID] ||
          (subscriber?.entitlements ? Object.values(subscriber.entitlements)[0] : undefined);

        const nowMs = Date.now();
        const expiresAt = ent?.expires_date ?? undefined;
        const isActive = Boolean(
          ent && (!expiresAt || Date.parse(expiresAt) > nowMs)
        );

        const productId = ent?.product_identifier;
        const subMeta = productId ? subscriber?.subscriptions?.[productId] : undefined;

        const snapshot: SubscriptionStatusSnapshot = {
          tier: isActive ? 'hai_plus' : 'free',
          isActive,
          entitlementId: DEFAULT_ENTITLEMENT_ID,
          productId,
          platform: isActive ? mapStoreStringToPlatform(subMeta?.store) : 'none',
          expiresAt,
          willRenew: Boolean(isActive && subMeta && !subMeta.unsubscribe_detected_at),
          managementUrl: subscriber?.management_url ?? undefined,
          source: 'revenuecat_server',
        };
        getWebhookStore().set(uid, snapshot);
        return snapshot;
      }
    } catch {
      // Fall back safely to webhook snapshot or unconfigured state
    }
  }

  const cached = getWebhookStore().get(uid);
  if (cached) {
    return cached;
  }

  return {
    tier: 'free',
    isActive: false,
    entitlementId: DEFAULT_ENTITLEMENT_ID,
    platform: 'none',
    willRenew: false,
    source: 'unconfigured',
  };
}

export function verifyRevenueCatWebhookSecret(authHeader: string | null): boolean {
  const expected = process.env.REVENUECAT_WEBHOOK_SECRET?.trim();
  if (!expected || !authHeader) return false;
  const candidate = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : authHeader.trim();

  const a = Buffer.from(candidate, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function applyRevenueCatWebhookEvent(payload: {
  event?: {
    type?: string;
    app_user_id?: string;
    product_id?: string;
    entitlement_ids?: string[] | null;
    expiration_at_ms?: number | null;
    store?: string;
  };
}): SubscriptionStatusSnapshot | null {
  const evt = payload.event;
  if (!evt || !isValidFirebaseUid(evt.app_user_id)) return null;

  const eventType = String(evt.type || '').toUpperCase();
  const inactiveEvents = new Set(['EXPIRATION', 'BILLING_ISSUE', 'SUBSCRIPTION_PAUSED']);
  const cancelledEvents = new Set(['CANCELLATION']);

  const expiresAt =
    typeof evt.expiration_at_ms === 'number' && evt.expiration_at_ms > 0
      ? new Date(evt.expiration_at_ms).toISOString()
      : undefined;

  const notExpiredYet = !expiresAt || Date.parse(expiresAt) > Date.now();
  const isActive = !inactiveEvents.has(eventType) && notExpiredYet;

  const snapshot: SubscriptionStatusSnapshot = {
    tier: isActive ? 'hai_plus' : 'free',
    isActive,
    entitlementId: evt.entitlement_ids?.[0] || DEFAULT_ENTITLEMENT_ID,
    productId: evt.product_id,
    platform: isActive ? mapStoreStringToPlatform(evt.store) : 'none',
    expiresAt,
    willRenew: isActive && !cancelledEvents.has(eventType),
    source: 'revenuecat_server',
  };

  getWebhookStore().set(evt.app_user_id, snapshot);
  return snapshot;
}
