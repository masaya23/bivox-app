export type NativeSnapshotTier = 'free' | 'plus' | 'pro';
export type NativeSnapshotBillingPeriod = 'monthly' | 'annual' | null;

export interface NativeSubscriptionSnapshot {
  userId: string;
  tier: NativeSnapshotTier;
  billingPeriod: NativeSnapshotBillingPeriod;
  expiresAt: string | null;
  updatedAt: string;
}

const STORAGE_KEY = 'englishapp_native_subscription_snapshot';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

export function readNativeSubscriptionSnapshot(): NativeSubscriptionSnapshot | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<NativeSubscriptionSnapshot>;
    if (!parsed.userId) {
      return null;
    }

    return {
      userId: parsed.userId,
      tier: parsed.tier === 'plus' || parsed.tier === 'pro' ? parsed.tier : 'free',
      billingPeriod:
        parsed.billingPeriod === 'monthly' || parsed.billingPeriod === 'annual'
          ? parsed.billingPeriod
          : null,
      expiresAt: typeof parsed.expiresAt === 'string' ? parsed.expiresAt : null,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeNativeSubscriptionSnapshot(snapshot: NativeSubscriptionSnapshot) {
  if (!isBrowser()) {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export function clearNativeSubscriptionSnapshot() {
  if (!isBrowser()) {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
}
