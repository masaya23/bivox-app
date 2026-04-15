import { getApp, getApps, initializeApp } from 'firebase/app';
import { doc, getDoc, getFirestore, setDoc, serverTimestamp } from 'firebase/firestore';

export type SyncedSubscriptionTier = 'free' | 'plus' | 'pro';
export type SyncedBillingPeriod = 'monthly' | 'annual' | null;

export interface SyncedSubscriptionRecord {
  tier: SyncedSubscriptionTier;
  expiresAt: string | null;
  billingPeriod: SyncedBillingPeriod;
  isTrialPeriod: boolean;
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
};

function isConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId
  );
}

function getDb() {
  if (!isConfigured()) {
    return null;
  }

  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  return getFirestore(app);
}

function normalizeDateValue(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return ((value as { toDate: () => Date }).toDate()).toISOString();
  }

  return null;
}

export async function loadSyncedSubscription(userId: string): Promise<SyncedSubscriptionRecord | null> {
  const db = getDb();
  if (!db || !userId) {
    return null;
  }

  try {
    const snapshot = await getDoc(doc(db, 'user_subscriptions', userId));
    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data() as Partial<SyncedSubscriptionRecord> & { expiresAt?: unknown };
    const tier = data.tier === 'plus' || data.tier === 'pro' ? data.tier : 'free';
    const billingPeriod = data.billingPeriod === 'monthly' || data.billingPeriod === 'annual'
      ? data.billingPeriod
      : null;

    return {
      tier,
      expiresAt: normalizeDateValue(data.expiresAt),
      billingPeriod,
      isTrialPeriod: data.isTrialPeriod === true,
    };
  } catch (error) {
    console.warn('Failed to load synced subscription', error);
    return null;
  }
}

export async function saveSyncedSubscription(
  userId: string,
  record: SyncedSubscriptionRecord
): Promise<boolean> {
  const db = getDb();
  if (!db || !userId) {
    return false;
  }

  try {
    await setDoc(
      doc(db, 'user_subscriptions', userId),
      {
        ...record,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.warn('Failed to save synced subscription', error);
    return false;
  }
}
