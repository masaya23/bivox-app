'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import type { CustomerInfo } from '@revenuecat/purchases-capacitor';
import { TrialStatus, StoreReceipt } from '@/types/auth';
import { getCurrentTrialStatus } from '@/utils/trialPrevention';
import { useAuth } from './AuthContext';
import { setApiUserPlan } from '@/utils/api';
import { isGuestUser } from '@/utils/guestAccess';
import { appendSubscriptionDebugLog } from '@/utils/subscriptionDebug';
import {
  clearNativeSubscriptionSnapshot,
  readNativeSubscriptionSnapshot,
  writeNativeSubscriptionSnapshot,
} from '@/utils/nativeSubscriptionSnapshot';
import { loadSyncedSubscription, saveSyncedSubscription } from '@/lib/subscriptionSync';
import {
  getRevenueCatExpirationDate,
  inferRevenueCatBillingPeriod,
  inferRevenueCatTier,
} from '@/utils/revenueCat';

// サブスクリプションプラン
export type SubscriptionTier = 'free' | 'plus' | 'pro';

// 課金周期
export type BillingPeriod = 'monthly' | 'annual';

// トレーニングモード
export type TrainingMode = 'tutorial' | 'shadowing' | 'speaking' | 'ai-drill' | 'ai-conversation';

// 各プランでアクセス可能なモード
const PLAN_ACCESS: Record<SubscriptionTier, TrainingMode[]> = {
  free: ['tutorial', 'shadowing'],
  plus: ['tutorial', 'shadowing', 'speaking'],
  pro: ['tutorial', 'shadowing', 'speaking', 'ai-drill', 'ai-conversation'],
};

// 各プランの月額料金
export const PLAN_PRICES: Record<SubscriptionTier, number> = {
  free: 0,
  plus: 800,
  pro: 1480,
};

// 各プランの年額料金（2ヶ月分お得）
export const ANNUAL_PLAN_PRICES: Record<SubscriptionTier, number> = {
  free: 0,
  plus: 8000,   // 月額800円 × 10ヶ月分
  pro: 14800,   // 月額1480円 × 10ヶ月分
};

// 各プランの名前
export const PLAN_NAMES: Record<SubscriptionTier, string> = {
  free: '無料プラン',
  plus: 'Plusプラン',
  pro: 'Proプラン',
};

// 各プランの説明
export const PLAN_DESCRIPTIONS: Record<SubscriptionTier, string[]> = {
  free: [
    'チュートリアル',
    'ベーシックモード（シャドーイング）',
    '広告表示あり',
  ],
  plus: [
    'チュートリアル',
    'ベーシックモード（シャドーイング）',
    'スピーキングモード',
    '広告なし',
  ],
  pro: [
    '全機能利用可能',
    'AI応用ドリル',
    'AIとフリー英会話',
    '広告なし',
  ],
};

// モード名の日本語マッピング
export const MODE_NAMES: Record<TrainingMode, string> = {
  tutorial: 'チュートリアル',
  shadowing: 'ベーシックモード',
  speaking: 'スピーキングモード',
  'ai-drill': 'AI応用ドリル',
  'ai-conversation': 'AIとフリー英会話',
};

// モードに必要な最低プラン
export const MODE_REQUIRED_PLAN: Record<TrainingMode, SubscriptionTier> = {
  tutorial: 'free',
  shadowing: 'free',
  speaking: 'plus',
  'ai-drill': 'pro',
  'ai-conversation': 'pro',
};

interface SubscriptionState {
  tier: SubscriptionTier;
  expiresAt: Date | null;
  isLoading: boolean;
  // 課金周期
  billingPeriod: BillingPeriod | null;
  // トライアル関連
  trialStatus: TrialStatus;
  isTrialPeriod: boolean;
  // レシート情報（本番用）
  lastReceipt: StoreReceipt | null;
  // デバッグ用オーバーライド
  debugOverridePlan: SubscriptionTier | null;
}

interface SubscriptionContextType extends SubscriptionState {
  // アクセス権限チェック
  canAccessMode: (mode: TrainingMode) => boolean;
  // 広告表示が必要か
  shouldShowAds: () => boolean;
  // アップグレード必要なプランを取得
  getRequiredPlanForMode: (mode: TrainingMode) => SubscriptionTier;
  // プランのアップグレード（開発用・デモ用）
  upgradePlan: (tier: SubscriptionTier, billingPeriod?: BillingPeriod) => void;
  // プランのリセット
  resetPlan: () => void;
  // プレミアムユーザーかどうか
  isPremium: () => boolean;
  // トライアル関連
  refreshTrialStatus: () => void;
  // レシート検証（本番用）
  validateReceipt: (receipt: StoreReceipt) => Promise<boolean>;
  // マスターアカウントかどうか
  isMasterAccount: boolean;
  // デバッグ用：プランのオーバーライド設定（マスターアカウントのみ使用可能）
  setDebugOverridePlan: (plan: SubscriptionTier | null) => void;
  // デバッグ用：現在有効なプランを取得（オーバーライドを考慮）
  getEffectiveTier: () => SubscriptionTier;
  // ネイティブストアの購読状態を同期
  syncNativeSubscription: (options?: { forceRestore?: boolean }) => Promise<boolean>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

const STORAGE_KEY = 'englishapp_subscription';
const DEBUG_OVERRIDE_KEY = 'englishapp_debug_override_plan';
const REVENUECAT_ENTITLEMENTS = {
  PLUS: 'plus',
  PRO: 'pro',
} as const;
const REVENUECAT_API_KEYS = {
  ios: process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY || '',
  android: process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY || '',
} as const;

let revenueCatConfigured = false;

interface StoredSubscription {
  tier: SubscriptionTier;
  expiresAt: string | null;
  billingPeriod?: BillingPeriod | null;
  isTrialPeriod?: boolean;
  lastReceipt?: StoreReceipt | null;
  userId?: string | null;
  userProvider?: string | null;
}

const initialTrialStatus: TrialStatus = {
  hasUsedTrial: false,
  isCurrentlyInTrial: false,
  trialStartDate: null,
  trialEndDate: null,
  daysRemaining: 0,
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function summarizeCustomerInfo(customerInfo: CustomerInfo) {
  return {
    originalAppUserId: customerInfo.originalAppUserId,
    activeSubscriptions: customerInfo.activeSubscriptions,
    allPurchasedProductIdentifiers: customerInfo.allPurchasedProductIdentifiers,
    latestExpirationDate: customerInfo.latestExpirationDate,
    managementURL: customerInfo.managementURL,
    entitlements: Object.fromEntries(
      Object.entries(customerInfo.entitlements.active).map(([key, entitlement]) => [
        key,
        {
          productIdentifier: entitlement.productIdentifier,
          productPlanIdentifier: entitlement.productPlanIdentifier ?? null,
          expirationDate: entitlement.expirationDate ?? null,
        },
      ])
    ),
  };
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  // AuthContextからマスターアカウント情報を取得
  const { user, isMaster, isLoading: isAuthLoading, useFirebase } = useAuth();
  const isNativePlatform = Capacitor.isNativePlatform();

  const [state, setState] = useState<SubscriptionState>({
    tier: 'free',
    expiresAt: null,
    isLoading: true,
    billingPeriod: null,
    trialStatus: initialTrialStatus,
    isTrialPeriod: false,
    lastReceipt: null,
    debugOverridePlan: null,
  });

  // ローカルストレージから状態を復元
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const trialStatus = getCurrentTrialStatus();

      // デバッグオーバーライドプランを読み込み（マスターアカウント用）
      const storedDebugPlan = localStorage.getItem(DEBUG_OVERRIDE_KEY);
      const debugOverridePlan = storedDebugPlan ? (storedDebugPlan as SubscriptionTier) : null;

      if (stored) {
        const parsed: StoredSubscription = JSON.parse(stored);
        const expiresAt = parsed.expiresAt ? new Date(parsed.expiresAt) : null;

        // 期限切れチェック
        if (expiresAt && expiresAt < new Date()) {
          // 期限切れの場合はfreeにリセット
          // ネイティブはRevenueCatが最新状態を確認するまでisLoadingを維持
          setState({
            tier: 'free',
            expiresAt: null,
            isLoading: Capacitor.isNativePlatform(),
            billingPeriod: null,
            trialStatus,
            isTrialPeriod: false,
            lastReceipt: null,
            debugOverridePlan,
          });
          localStorage.removeItem(STORAGE_KEY);
        } else {
          setState({
            tier: parsed.tier,
            expiresAt,
            isLoading: false,
            billingPeriod: parsed.billingPeriod || null,
            trialStatus,
            isTrialPeriod: parsed.isTrialPeriod || false,
            lastReceipt: parsed.lastReceipt || null,
            debugOverridePlan,
          });
        }
      } else {
        // トライアル中ならトライアル権限を適用
        if (trialStatus.isCurrentlyInTrial) {
          setState({
            tier: 'pro', // トライアルはProプラン相当
            expiresAt: trialStatus.trialEndDate ? new Date(trialStatus.trialEndDate) : null,
            isLoading: false,
            billingPeriod: null,
            trialStatus,
            isTrialPeriod: true,
            lastReceipt: null,
            debugOverridePlan,
          });
        } else {
          // ストレージに購読なし・トライアルなし
          // ネイティブはRevenueCatが確認するまでisLoadingを維持してペイウォールフラッシュを防ぐ
          setState(prev => ({
            ...prev,
            isLoading: Capacitor.isNativePlatform(),
            trialStatus,
            debugOverridePlan,
          }));
        }
      }
    } catch {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // 状態をローカルストレージに保存
  const saveState = useCallback((
    tier: SubscriptionTier,
    expiresAt: Date | null,
    isTrialPeriod: boolean = false,
    lastReceipt: StoreReceipt | null = null,
    billingPeriod: BillingPeriod | null = null
  ) => {
    const data: StoredSubscription = {
      tier,
      expiresAt: expiresAt?.toISOString() || null,
      billingPeriod,
      isTrialPeriod,
      lastReceipt,
      userId: user && !isGuestUser(user) ? user.id : null,
      userProvider: user?.provider ?? null,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [user]);

  const getNativeSnapshotForCurrentUser = useCallback(() => {
    if (!isNativePlatform || !user || isGuestUser(user)) {
      return null;
    }

    const snapshot = readNativeSubscriptionSnapshot();
    if (!snapshot || snapshot.userId !== user.id) {
      return null;
    }

    if (snapshot.expiresAt) {
      const expiresAt = new Date(snapshot.expiresAt);
      if (expiresAt < new Date()) {
        return null;
      }
    }

    return snapshot;
  }, [isNativePlatform, user]);

  const applyRevenueCatCustomerInfo = useCallback(async (
    customerInfo: CustomerInfo
  ): Promise<SubscriptionTier> => {
    const trialStatus = getCurrentTrialStatus();
    const revenueCatTier = inferRevenueCatTier(customerInfo);
    const hasPlus = !!customerInfo.entitlements.active[REVENUECAT_ENTITLEMENTS.PLUS];
    const hasPro = !!customerInfo.entitlements.active[REVENUECAT_ENTITLEMENTS.PRO];

    let tier: SubscriptionTier = revenueCatTier;
    let expiresAt: Date | null = getRevenueCatExpirationDate(customerInfo, revenueCatTier);
    let billingPeriod: BillingPeriod | null = inferRevenueCatBillingPeriod(customerInfo, revenueCatTier);

    if (tier === 'free' && trialStatus.isCurrentlyInTrial) {
      tier = 'pro';
      expiresAt = trialStatus.trialEndDate ? new Date(trialStatus.trialEndDate) : null;
      billingPeriod = null;
    }

    if (user && !isGuestUser(user)) {
      writeNativeSubscriptionSnapshot({
        userId: user.id,
        tier,
        billingPeriod,
        expiresAt: expiresAt?.toISOString() || null,
        updatedAt: new Date().toISOString(),
      });
    }

    appendSubscriptionDebugLog('SubscriptionContext', 'apply_customer_info', {
      userId: user?.id ?? null,
      revenueCatTier,
      tier,
      expiresAt: expiresAt?.toISOString() || null,
      billingPeriod,
      customerInfo: summarizeCustomerInfo(customerInfo),
    });

    setState(prev => ({
      ...prev,
      tier,
      expiresAt,
      isLoading: false,
      billingPeriod,
      trialStatus,
      isTrialPeriod: tier === 'pro' && trialStatus.isCurrentlyInTrial && !hasPro,
      lastReceipt: prev.lastReceipt,
    }));
    saveState(tier, expiresAt, tier === 'pro' && trialStatus.isCurrentlyInTrial && !hasPro, null, billingPeriod);

    if (useFirebase && user && !isGuestUser(user)) {
      void saveSyncedSubscription(user.id, {
        tier,
        expiresAt: expiresAt?.toISOString() || null,
        billingPeriod,
        isTrialPeriod: tier === 'pro' && trialStatus.isCurrentlyInTrial && !hasPro,
      });
    }

    console.warn('RevenueCat subscription applied', {
      userId: user?.id ?? null,
      revenueCatTier,
      tier,
      hasPlus,
      hasPro,
      activeSubscriptions: customerInfo.activeSubscriptions,
      entitlementProducts: {
        plus: customerInfo.entitlements.active[REVENUECAT_ENTITLEMENTS.PLUS]?.productIdentifier || null,
        pro: customerInfo.entitlements.active[REVENUECAT_ENTITLEMENTS.PRO]?.productIdentifier || null,
      },
    });

    return revenueCatTier;
  }, [saveState, useFirebase, user]);

  const syncRevenueCatSubscription = useCallback(async (
    options?: { forceRestore?: boolean }
  ): Promise<boolean> => {
    if (!Capacitor.isNativePlatform() || !user?.id) {
      appendSubscriptionDebugLog('SubscriptionContext', 'sync_skipped', {
        reason: 'not_native_or_no_user',
        isNative: Capacitor.isNativePlatform(),
        userId: user?.id ?? null,
      });
      return false;
    }

    const apiKey = Capacitor.getPlatform() === 'ios'
      ? REVENUECAT_API_KEYS.ios
      : REVENUECAT_API_KEYS.android;

    if (!apiKey) {
      appendSubscriptionDebugLog('SubscriptionContext', 'sync_skipped', {
        reason: 'missing_api_key',
        userId: user.id,
      });
      return false;
    }

    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      appendSubscriptionDebugLog('SubscriptionContext', 'sync_started', {
        userId: user.id,
        forceRestore: options?.forceRestore === true,
      });

      if (!revenueCatConfigured) {
        await Purchases.configure({ apiKey, appUserID: user.id });
        revenueCatConfigured = true;
        appendSubscriptionDebugLog('SubscriptionContext', 'configured', { userId: user.id });
      } else {
        await Purchases.logIn({ appUserID: user.id });
        appendSubscriptionDebugLog('SubscriptionContext', 'login', { userId: user.id });
      }

      const waitForSubscription = async (attempts: number, intervalMs: number): Promise<CustomerInfo> => {
        let latestInfo = (await Purchases.getCustomerInfo()).customerInfo;
        let latestTier = inferRevenueCatTier(latestInfo);

        for (let attempt = 0; attempt < attempts && latestTier === 'free'; attempt += 1) {
          if (attempt > 0) {
            await delay(intervalMs);
          }
          await Purchases.invalidateCustomerInfoCache().catch(() => undefined);
          latestInfo = (await Purchases.getCustomerInfo()).customerInfo;
          latestTier = inferRevenueCatTier(latestInfo);
        }

        return latestInfo;
      };

      await Purchases.invalidateCustomerInfoCache().catch(() => undefined);
      await Purchases.syncPurchases().catch((error) => {
        console.warn('RevenueCat syncPurchases failed', error);
        appendSubscriptionDebugLog('SubscriptionContext', 'sync_purchases_failed', error);
      });

      let customerInfo = await waitForSubscription(5, 1000);
      let revenueCatTier = inferRevenueCatTier(customerInfo);

      if (revenueCatTier === 'free' && options?.forceRestore) {
        try {
          const restored = await Purchases.restorePurchases();
          customerInfo = restored.customerInfo;
          revenueCatTier = inferRevenueCatTier(customerInfo);
          appendSubscriptionDebugLog('SubscriptionContext', 'force_restore_result', {
            revenueCatTier,
            customerInfo: summarizeCustomerInfo(customerInfo),
          });
        } catch (error) {
          console.warn('RevenueCat restorePurchases failed during sync', error);
          appendSubscriptionDebugLog('SubscriptionContext', 'force_restore_failed', error);
        }

        if (revenueCatTier === 'free') {
          await Purchases.syncPurchases().catch(() => undefined);
          customerInfo = await waitForSubscription(6, 1200);
          revenueCatTier = inferRevenueCatTier(customerInfo);
        }
      }

      const { appUserID } = await Purchases.getAppUserID();
      console.warn('RevenueCat sync app user', { expectedUserId: user.id, revenueCatAppUserId: appUserID });
      appendSubscriptionDebugLog('SubscriptionContext', 'sync_app_user', {
        expectedUserId: user.id,
        revenueCatAppUserId: appUserID,
        revenueCatTier,
        customerInfo: summarizeCustomerInfo(customerInfo),
      });

      await applyRevenueCatCustomerInfo(customerInfo);
      return revenueCatTier !== 'free';
    } catch (error) {
      console.error('Failed to sync RevenueCat subscription:', error);
      appendSubscriptionDebugLog('SubscriptionContext', 'sync_failed', {
        userId: user.id,
        error,
      });
      setState(prev => ({
        ...prev,
        isLoading: false,
      }));
      return false;
    }
  }, [applyRevenueCatCustomerInfo, user]);

  // 有効なプランを計算するヘルパー
  const computeEffectiveTier = useCallback((): SubscriptionTier => {
    if (!user || isGuestUser(user)) {
      return 'free';
    }

    // デバッグオーバーライドが設定されている場合（マスターアカウントのみ）
    if (isMaster && state.debugOverridePlan !== null) {
      return state.debugOverridePlan;
    }

    const nativeSnapshot = getNativeSnapshotForCurrentUser();
    if (nativeSnapshot) {
      return nativeSnapshot.tier;
    }

    // 実際のプランをそのまま使用（マスターアカウントでも特別扱いしない）
    return state.tier;
  }, [getNativeSnapshotForCurrentUser, isMaster, state.debugOverridePlan, state.tier, user]);

  useEffect(() => {
    if (isAuthLoading || state.isLoading) {
      return;
    }

    const currentUserId = user && !isGuestUser(user) ? user.id : null;
    const trialStatus = getCurrentTrialStatus();
    const storedRaw = localStorage.getItem(STORAGE_KEY);

    if (!storedRaw) {
      return;
    }

    let stored: StoredSubscription | null = null;
    try {
      stored = JSON.parse(storedRaw) as StoredSubscription;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    if (!currentUserId) {
      localStorage.removeItem(STORAGE_KEY);
      clearNativeSubscriptionSnapshot();
      setState(prev => ({
        ...prev,
        tier: 'free',
        expiresAt: null,
        billingPeriod: null,
        isTrialPeriod: false,
        lastReceipt: null,
        trialStatus,
      }));
      return;
    }

    if (stored.userId && stored.userId !== currentUserId) {
      localStorage.removeItem(STORAGE_KEY);
      clearNativeSubscriptionSnapshot();
      setState(prev => ({
        ...prev,
        tier: 'free',
        expiresAt: null,
        billingPeriod: null,
        isTrialPeriod: false,
        lastReceipt: null,
        trialStatus,
      }));
      return;
    }

    if (!stored.userId) {
      saveState(
        state.tier,
        state.expiresAt,
        state.isTrialPeriod,
        state.lastReceipt,
        state.billingPeriod
      );
    }
  }, [
    isAuthLoading,
    saveState,
    state.billingPeriod,
    state.expiresAt,
    state.isLoading,
    state.isTrialPeriod,
    state.lastReceipt,
    state.tier,
    user,
  ]);

  useEffect(() => {
    if (isNativePlatform || isAuthLoading || !useFirebase || !user?.id || isGuestUser(user)) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const synced = await loadSyncedSubscription(user.id);
      if (cancelled || !synced) {
        return;
      }

      const trialStatus = getCurrentTrialStatus();
      const expiresAt = synced.expiresAt ? new Date(synced.expiresAt) : null;

      if (expiresAt && expiresAt < new Date()) {
        setState(prev => ({
          ...prev,
          tier: 'free',
          expiresAt: null,
          isLoading: false,
          billingPeriod: null,
          trialStatus,
          isTrialPeriod: false,
          lastReceipt: null,
        }));
        saveState('free', null, false, null, null);
        return;
      }

      setState(prev => ({
        ...prev,
        tier: synced.tier,
        expiresAt,
        isLoading: false,
        billingPeriod: synced.billingPeriod,
        trialStatus,
        isTrialPeriod: synced.isTrialPeriod,
      }));
      saveState(synced.tier, expiresAt, synced.isTrialPeriod, null, synced.billingPeriod);
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthLoading, isNativePlatform, saveState, useFirebase, user]);

  // モードへのアクセス権限チェック
  const canAccessMode = useCallback((mode: TrainingMode): boolean => {
    const effectiveTier = computeEffectiveTier();
    return PLAN_ACCESS[effectiveTier].includes(mode);
  }, [computeEffectiveTier]);

  // 広告表示が必要か
  const shouldShowAds = useCallback((): boolean => {
    const effectiveTier = computeEffectiveTier();
    return effectiveTier === 'free';
  }, [computeEffectiveTier]);

  // モードに必要なプランを取得
  const getRequiredPlanForMode = useCallback((mode: TrainingMode): SubscriptionTier => {
    return MODE_REQUIRED_PLAN[mode];
  }, []);

  useEffect(() => {
    if (isAuthLoading || isMaster) {
      return;
    }

    if (!Capacitor.isNativePlatform() || !user?.id || isGuestUser(user)) {
      return;
    }

    void syncRevenueCatSubscription();
  }, [isAuthLoading, isMaster, syncRevenueCatSubscription, user?.id]);

  // ネイティブでユーザー未ログイン/ゲストの場合、RevenueCatは走らないので
  // isLoadingが永遠にtrueのままにならないよう解除するフォールバック
  useEffect(() => {
    if (isAuthLoading || !Capacitor.isNativePlatform()) return;
    if (!state.isLoading) return;
    if (!user?.id || isGuestUser(user)) {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [isAuthLoading, user?.id, state.isLoading]);

  useEffect(() => {
    if (isAuthLoading || !isNativePlatform || !user?.id || isGuestUser(user)) {
      return;
    }

    const apiKey = Capacitor.getPlatform() === 'ios'
      ? REVENUECAT_API_KEYS.ios
      : REVENUECAT_API_KEYS.android;

    if (!apiKey) {
      return;
    }

    let cancelled = false;
    let listenerId: string | null = null;

    void (async () => {
      try {
        const { Purchases } = await import('@revenuecat/purchases-capacitor');

        if (!revenueCatConfigured) {
          await Purchases.configure({ apiKey, appUserID: user.id });
          revenueCatConfigured = true;
        } else {
          await Purchases.logIn({ appUserID: user.id });
        }

        listenerId = await Purchases.addCustomerInfoUpdateListener((customerInfo) => {
          if (cancelled) {
            return;
          }
          void applyRevenueCatCustomerInfo(customerInfo);
        });
      } catch (error) {
        console.warn('Failed to attach RevenueCat customer info listener', error);
      }
    })();

    return () => {
      cancelled = true;
      if (!listenerId) {
        return;
      }

      void (async () => {
        try {
          const { Purchases } = await import('@revenuecat/purchases-capacitor');
          await Purchases.removeCustomerInfoUpdateListener({ listenerToRemove: listenerId });
        } catch (error) {
          console.warn('Failed to remove RevenueCat customer info listener', error);
        }
      })();
    };
  }, [applyRevenueCatCustomerInfo, isAuthLoading, isNativePlatform, user]);

  // プランのアップグレード（開発用・デモ用）
  const upgradePlan = useCallback((newTier: SubscriptionTier, newBillingPeriod: BillingPeriod = 'annual') => {
    // 実際のアプリではここで決済処理を行う
    // 月額: 1ヶ月後、年額: 1年後に期限切れ
    let expiresAt: Date | null = null;
    let billingPeriod: BillingPeriod | null = null;
    if (newTier !== 'free') {
      const durationMs = newBillingPeriod === 'annual'
        ? 365 * 24 * 60 * 60 * 1000  // 1年
        : 30 * 24 * 60 * 60 * 1000;  // 1ヶ月
      expiresAt = new Date(Date.now() + durationMs);
      billingPeriod = newBillingPeriod;
    }
    const trialStatus = getCurrentTrialStatus();

    // デバッグオーバーライドをクリア
    localStorage.removeItem(DEBUG_OVERRIDE_KEY);

    setState({
      tier: newTier,
      expiresAt,
      isLoading: false,
      billingPeriod,
      trialStatus,
      isTrialPeriod: false, // 有料プランなのでトライアルではない
      lastReceipt: null,
      debugOverridePlan: null, // 実際のプラン変更時はデバッグオーバーライドをクリア
    });
    saveState(newTier, expiresAt, false, null, billingPeriod);
    if (useFirebase && user && !isGuestUser(user)) {
      void saveSyncedSubscription(user.id, {
        tier: newTier,
        expiresAt: expiresAt?.toISOString() || null,
        billingPeriod,
        isTrialPeriod: false,
      });
    }
  }, [saveState, useFirebase, user]);

  // プランのリセット
  const resetPlan = useCallback(() => {
    const trialStatus = getCurrentTrialStatus();
    setState(prev => ({
      tier: 'free',
      expiresAt: null,
      isLoading: false,
      billingPeriod: null,
      trialStatus,
      isTrialPeriod: false,
      lastReceipt: null,
      debugOverridePlan: prev.debugOverridePlan,
    }));
    localStorage.removeItem(STORAGE_KEY);
    if (useFirebase && user && !isGuestUser(user)) {
      void saveSyncedSubscription(user.id, {
        tier: 'free',
        expiresAt: null,
        billingPeriod: null,
        isTrialPeriod: false,
      });
    }
  }, [useFirebase, user]);

  // プレミアムユーザーかどうか
  const isPremium = useCallback((): boolean => {
    const effectiveTier = computeEffectiveTier();
    return effectiveTier !== 'free';
  }, [computeEffectiveTier]);

  // トライアル状態を更新
  const refreshTrialStatus = useCallback(() => {
    const trialStatus = getCurrentTrialStatus();
    setState(prev => ({
      ...prev,
      trialStatus,
      // トライアル中ならPro権限を適用
      tier: trialStatus.isCurrentlyInTrial && prev.tier === 'free' ? 'pro' : prev.tier,
      isTrialPeriod: trialStatus.isCurrentlyInTrial && prev.lastReceipt === null,
    }));
  }, []);

  // レシート検証（本番用）
  const validateReceipt = useCallback(async (receipt: StoreReceipt): Promise<boolean> => {
    // 本番環境ではサーバーサイドでレシート検証を行う
    // ここでは開発用モックとして常に成功を返す

    // 1. サーバーにレシートを送信
    // 2. Apple/Google のサーバーで検証
    // 3. 結果に基づいてサブスクリプション状態を更新

    // モック実装
    console.log('Validating receipt:', receipt.productId);

    // トライアル期間かどうかをチェック
    const isTrialPeriod = receipt.isTrialPeriod;

    // プランを特定（productIdから判断）
    let tier: SubscriptionTier = 'free';
    if (receipt.productId.includes('pro')) {
      tier = 'pro';
    } else if (receipt.productId.includes('plus')) {
      tier = 'plus';
    }

    // 課金周期を特定（productIdから判断）
    let billingPeriod: BillingPeriod | null = null;
    if (tier !== 'free') {
      billingPeriod = receipt.productId.includes('annual') || receipt.productId.includes('yearly') ? 'annual' : 'monthly';
    }

    // 状態を更新
    const expiresAt = new Date(receipt.expiresDate);
    const trialStatus = getCurrentTrialStatus();

    setState({
      tier,
      expiresAt,
      isLoading: false,
      billingPeriod,
      trialStatus,
      isTrialPeriod,
      lastReceipt: receipt,
      debugOverridePlan: null, // 実際のプラン変更時はデバッグオーバーライドをクリア
    });

    saveState(tier, expiresAt, isTrialPeriod, receipt, billingPeriod);
    // デバッグオーバーライドもクリア
    localStorage.removeItem(DEBUG_OVERRIDE_KEY);
    if (useFirebase && user && !isGuestUser(user)) {
      void saveSyncedSubscription(user.id, {
        tier,
        expiresAt: expiresAt?.toISOString() || null,
        billingPeriod,
        isTrialPeriod,
      });
    }

    return true;
  }, [saveState, useFirebase, user]);

  // デバッグ用：プランのオーバーライド設定（マスターアカウントのみ）
  const setDebugOverridePlan = useCallback((plan: SubscriptionTier | null) => {
    // マスターアカウントでない場合は無視
    if (!isMaster) return;
    setState(prev => ({
      ...prev,
      debugOverridePlan: plan,
    }));
    // localStorageに永続化
    if (plan === null) {
      localStorage.removeItem(DEBUG_OVERRIDE_KEY);
    } else {
      localStorage.setItem(DEBUG_OVERRIDE_KEY, plan);
    }
  }, [isMaster]);

  // デバッグ用：現在有効なプランを取得（オーバーライドを考慮）
  const getEffectiveTier = useCallback((): SubscriptionTier => {
    return computeEffectiveTier();
  }, [computeEffectiveTier]);

  // プラン変更時にAPIヘッダー用のプランを同期
  // マスターアカウントは'master'を送信（サーバー側で日次制限スキップ）
  useEffect(() => {
    if (isMaster) {
      setApiUserPlan('master' as any);
    } else {
      setApiUserPlan(computeEffectiveTier());
    }
  }, [computeEffectiveTier, isMaster]);

  const effectiveTier = computeEffectiveTier();
  const nativeSnapshot = getNativeSnapshotForCurrentUser();
  const effectiveBillingPeriod =
    nativeSnapshot?.billingPeriod ?? (effectiveTier === 'free' ? null : state.billingPeriod);
  const effectiveExpiresAt =
    nativeSnapshot?.expiresAt ? new Date(nativeSnapshot.expiresAt) : state.expiresAt;

  const value: SubscriptionContextType = {
    ...state,
    // auth loadingが終わるまでisLoadingをtrueに保つ
    // user=nullの間はcomputeEffectiveTierが'free'を返すため
    // ペイウォールやロックアイコンが誤表示されるのを防ぐ
    isLoading: state.isLoading || isAuthLoading,
    tier: effectiveTier,
    billingPeriod: effectiveBillingPeriod,
    expiresAt: effectiveExpiresAt,
    canAccessMode,
    shouldShowAds,
    getRequiredPlanForMode,
    upgradePlan,
    resetPlan,
    isPremium,
    refreshTrialStatus,
    validateReceipt,
    isMasterAccount: isMaster,
    setDebugOverridePlan,
    getEffectiveTier,
    syncNativeSubscription: syncRevenueCatSubscription,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextType {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

// プランの比較用ユーティリティ
export function comparePlans(a: SubscriptionTier, b: SubscriptionTier): number {
  const order: Record<SubscriptionTier, number> = { free: 0, plus: 1, pro: 2 };
  return order[a] - order[b];
}

// プランがもう一方以上かどうか
export function isPlanAtLeast(current: SubscriptionTier, required: SubscriptionTier): boolean {
  return comparePlans(current, required) >= 0;
}
