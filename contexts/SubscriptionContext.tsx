'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { TrialStatus, StoreReceipt } from '@/types/auth';
import { getCurrentTrialStatus } from '@/utils/trialPrevention';
import { useAuth } from './AuthContext';
import { setApiUserPlan } from '@/utils/api';
import { isGuestUser } from '@/utils/guestAccess';
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
  syncNativeSubscription: () => Promise<void>;
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
}

const initialTrialStatus: TrialStatus = {
  hasUsedTrial: false,
  isCurrentlyInTrial: false,
  trialStartDate: null,
  trialEndDate: null,
  daysRemaining: 0,
};

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  // AuthContextからマスターアカウント情報を取得
  const { user, isMaster, isLoading: isAuthLoading } = useAuth();

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
          setState({
            tier: 'free',
            expiresAt: null,
            isLoading: false,
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
          setState(prev => ({
            ...prev,
            isLoading: false,
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
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, []);

  const syncRevenueCatSubscription = useCallback(async () => {
    if (!Capacitor.isNativePlatform() || !user?.id) {
      return;
    }

    const apiKey = Capacitor.getPlatform() === 'ios'
      ? REVENUECAT_API_KEYS.ios
      : REVENUECAT_API_KEYS.android;

    if (!apiKey) {
      return;
    }

    const trialStatus = getCurrentTrialStatus();

    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');

      if (!revenueCatConfigured) {
        await Purchases.configure({ apiKey });
        revenueCatConfigured = true;
      }

      const loginResult = await Purchases.logIn({ appUserID: user.id });
      await Purchases.syncPurchases();
      let customerInfo = loginResult.customerInfo;

      if (
        !customerInfo.entitlements.active[REVENUECAT_ENTITLEMENTS.PLUS]
        && !customerInfo.entitlements.active[REVENUECAT_ENTITLEMENTS.PRO]
      ) {
        const syncedInfo = await Purchases.getCustomerInfo();
        customerInfo = syncedInfo.customerInfo;
      }

      if (
        !customerInfo.entitlements.active[REVENUECAT_ENTITLEMENTS.PLUS]
        && !customerInfo.entitlements.active[REVENUECAT_ENTITLEMENTS.PRO]
      ) {
        const restoredInfo = await Purchases.restorePurchases();
        customerInfo = restoredInfo.customerInfo;
      }

      const hasPlus = !!customerInfo.entitlements.active[REVENUECAT_ENTITLEMENTS.PLUS];
      const hasPro = !!customerInfo.entitlements.active[REVENUECAT_ENTITLEMENTS.PRO];

      let tier: SubscriptionTier = inferRevenueCatTier(customerInfo);
      let expiresAt: Date | null = getRevenueCatExpirationDate(customerInfo, tier);
      let billingPeriod: BillingPeriod | null = inferRevenueCatBillingPeriod(customerInfo, tier);

      if (tier === 'free' && trialStatus.isCurrentlyInTrial) {
        tier = 'pro';
        expiresAt = trialStatus.trialEndDate ? new Date(trialStatus.trialEndDate) : null;
        billingPeriod = null;
      }

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
      console.warn('RevenueCat subscription synced', {
        userId: user.id,
        tier,
        hasPlus,
        hasPro,
        activeSubscriptions: customerInfo.activeSubscriptions,
        entitlementProducts: {
          plus: customerInfo.entitlements.active[REVENUECAT_ENTITLEMENTS.PLUS]?.productIdentifier || null,
          pro: customerInfo.entitlements.active[REVENUECAT_ENTITLEMENTS.PRO]?.productIdentifier || null,
        },
      });
    } catch (error) {
      console.error('Failed to sync RevenueCat subscription:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
      }));
    }
  }, [saveState, user?.id]);

  // 有効なプランを計算するヘルパー
  const computeEffectiveTier = useCallback((): SubscriptionTier => {
    if (!user || isGuestUser(user)) {
      return 'free';
    }

    // デバッグオーバーライドが設定されている場合（マスターアカウントのみ）
    if (isMaster && state.debugOverridePlan !== null) {
      return state.debugOverridePlan;
    }
    // 実際のプランをそのまま使用（マスターアカウントでも特別扱いしない）
    return state.tier;
  }, [isMaster, state.debugOverridePlan, state.tier]);

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

    setState(prev => ({ ...prev, isLoading: true }));
    void syncRevenueCatSubscription();
  }, [isAuthLoading, isMaster, syncRevenueCatSubscription, user?.id]);

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
  }, [saveState]);

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
  }, []);

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

    return true;
  }, [saveState]);

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

  const value: SubscriptionContextType = {
    ...state,
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
