import type { CustomerInfo, PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { getMobilePlatform, isNativeCapacitor } from '@/lib/mobile/capacitor';
import type { SubscriptionPackageOption, SubscriptionStatusSnapshot } from '@/types/hai';

const ENTITLEMENT_ID = process.env.NEXT_PUBLIC_REVENUECAT_ENTITLEMENT_ID?.trim() || 'hai_plus';

let configuredForApp = false;
let currentAppUserId: string | null = null;
const cachedPackagesById = new Map<string, PurchasesPackage>();

export function getRevenueCatPublicKey(): string {
  const platform = getMobilePlatform();
  if (platform === 'android') {
    return process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY?.trim() || '';
  }
  if (platform === 'ios') {
    return process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY?.trim() || '';
  }
  return '';
}

export function isNativeBillingReady(): boolean {
  return isNativeCapacitor() && Boolean(getRevenueCatPublicKey());
}

export function mapCustomerInfoToSnapshot(
  info: CustomerInfo,
  platform: 'android' | 'ios' | 'web' = getMobilePlatform()
): SubscriptionStatusSnapshot {
  const activeEntitlement =
    info.entitlements.active[ENTITLEMENT_ID] ||
    Object.values(info.entitlements.active)[0] ||
    null;

  if (!activeEntitlement) {
    return {
      tier: 'free',
      isActive: false,
      entitlementId: ENTITLEMENT_ID,
      platform: 'none',
      willRenew: false,
      managementUrl: info.managementURL ?? undefined,
      source: 'revenuecat_sdk',
    };
  }

  return {
    tier: 'hai_plus',
    isActive: true,
    entitlementId: activeEntitlement.identifier || ENTITLEMENT_ID,
    productId: activeEntitlement.productIdentifier,
    platform,
    expiresAt: activeEntitlement.expirationDate ?? undefined,
    willRenew: Boolean(activeEntitlement.willRenew),
    managementUrl: info.managementURL ?? undefined,
    source: 'revenuecat_sdk',
  };
}

export async function syncRevenueCatUser(
  firebaseUid: string
): Promise<SubscriptionStatusSnapshot | null> {
  if (!isNativeCapacitor()) return null;
  const apiKey = getRevenueCatPublicKey();
  if (!apiKey) return null;

  const { Purchases, LOG_LEVEL } = await import('@revenuecat/purchases-capacitor');

  if (!configuredForApp) {
    if (process.env.NODE_ENV !== 'production') {
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG }).catch(() => {});
    }
    await Purchases.configure({
      apiKey,
      appUserID: firebaseUid,
    });
    configuredForApp = true;
    currentAppUserId = firebaseUid;
    const { customerInfo } = await Purchases.getCustomerInfo();
    return mapCustomerInfoToSnapshot(customerInfo);
  }

  if (currentAppUserId !== firebaseUid) {
    const result = await Purchases.logIn({ appUserID: firebaseUid });
    currentAppUserId = firebaseUid;
    return mapCustomerInfoToSnapshot(result.customerInfo);
  }

  const { customerInfo } = await Purchases.getCustomerInfo();
  return mapCustomerInfoToSnapshot(customerInfo);
}

export async function logoutRevenueCatUser(): Promise<void> {
  if (!isNativeCapacitor() || !configuredForApp) return;
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    await Purchases.logOut();
    currentAppUserId = null;
  } catch {
    // Ignore when already anonymous
  }
}

export async function fetchNativeRevenueCatPackages(): Promise<SubscriptionPackageOption[]> {
  if (!isNativeBillingReady()) return [];

  const { Purchases } = await import('@revenuecat/purchases-capacitor');
  const offerings = await Purchases.getOfferings();
  const available = offerings.current?.availablePackages ?? [];

  cachedPackagesById.clear();

  return available.map((pkg) => {
    cachedPackagesById.set(pkg.identifier, pkg);
    const periodLabel =
      pkg.packageType === 'ANNUAL'
        ? 'Anual'
        : pkg.packageType === 'MONTHLY'
        ? 'Lunar'
        : pkg.packageType === 'WEEKLY'
        ? 'Săptămânal'
        : 'Pachet';

    return {
      identifier: pkg.identifier,
      packageType: String(pkg.packageType),
      title: pkg.product.title || `HAI+ ${periodLabel}`,
      description: pkg.product.description || 'Acces extins la funcțiile HAI+.',
      priceString: pkg.product.priceString,
      periodLabel,
    };
  });
}

export async function purchaseNativeRevenueCatPackage(
  packageIdentifier: string
): Promise<{
  ok: boolean;
  cancelled?: boolean;
  snapshot?: SubscriptionStatusSnapshot;
  error?: string;
}> {
  if (!isNativeBillingReady()) {
    return {
      ok: false,
      error: 'Plățile în aplicație sunt disponibile doar în build-ul nativ cu cheia RevenueCat configurată.',
    };
  }

  let pkg = cachedPackagesById.get(packageIdentifier);
  if (!pkg) {
    await fetchNativeRevenueCatPackages();
    pkg = cachedPackagesById.get(packageIdentifier);
  }
  if (!pkg) {
    return { ok: false, error: 'Pachetul de abonament selectat nu este disponibil.' };
  }

  try {
    const { Purchases, PURCHASES_ERROR_CODE } = await import('@revenuecat/purchases-capacitor');
    const result = await Purchases.purchasePackage({ aPackage: pkg });
    return {
      ok: true,
      snapshot: mapCustomerInfoToSnapshot(result.customerInfo),
    };
  } catch (err: unknown) {
    const { PURCHASES_ERROR_CODE } = await import('@revenuecat/purchases-capacitor').catch(() => ({
      PURCHASES_ERROR_CODE: undefined,
    }));
    const rcErr = err as { code?: string | number; userCancelled?: boolean; message?: string };
    if (
      rcErr?.userCancelled ||
      (PURCHASES_ERROR_CODE && rcErr?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) ||
      String(rcErr?.code) === '1'
    ) {
      return { ok: false, cancelled: true };
    }
    return {
      ok: false,
      error: rcErr?.message || 'Achiziția nu a putut fi finalizată.',
    };
  }
}

export async function restoreNativeRevenueCatPurchases(): Promise<{
  ok: boolean;
  snapshot?: SubscriptionStatusSnapshot;
  error?: string;
}> {
  if (!isNativeBillingReady()) {
    return { ok: false, error: 'Restaurarea este disponibilă doar în aplicația mobilă.' };
  }
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const { customerInfo } = await Purchases.restorePurchases();
    return {
      ok: true,
      snapshot: mapCustomerInfoToSnapshot(customerInfo),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Nu am putut restaura achizițiile.';
    return { ok: false, error: msg };
  }
}
