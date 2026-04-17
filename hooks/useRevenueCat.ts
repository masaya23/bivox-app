'use client';

import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import type { CustomerInfo, PurchasesPackage, PurchasesOffering } from '@revenuecat/purchases-capacitor';
import { PRORATION_MODE } from '@revenuecat/purchases-capacitor';
import { useAuth } from '@/contexts/AuthContext';
import { isGuestUser } from '@/utils/guestAccess';
import { getAppInstanceId, logSubscriptionStart } from '@/utils/analytics';
import { appendSubscriptionDebugLog } from '@/utils/subscriptionDebug';
import {
  clearNativeSubscriptionSnapshot,
  writeNativeSubscriptionSnapshot,
} from '@/utils/nativeSubscriptionSnapshot';
import {
  getCurrentRevenueCatProductIdentifier,
  getRevenueCatExpirationDate,
  inferRevenueCatBillingPeriod,
  inferRevenueCatTier,
  packageMatchesPlan,
} from '@/utils/revenueCat';

// RevenueCatの設定
const REVENUECAT_CONFIG = {
  // RevenueCat APIキー（本番用は.env.localに設定）
  API_KEY_IOS: process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY || '',
  API_KEY_ANDROID: process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY || '',

  // Offering内のパッケージID（RevenueCatダッシュボードで設定したidentifier）
  PACKAGE_IDS: {
    PLUS_MONTHLY: '$rc_monthly',
    PLUS_ANNUAL: '$rc_annual',
    PRO_MONTHLY: 'pro_monthly',
    PRO_ANNUAL: 'pro_annual',
  },

  // エンタイトルメント（権限）ID
  // RevenueCatダッシュボードのIdentifierと一致させる
  ENTITLEMENTS: {
    PLUS: 'plus',
    PRO: 'pro',
  },
};

// サブスクリプション状態
interface SubscriptionState {
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // 現在のプラン
  currentPlan: 'free' | 'plus' | 'pro';

  // エンタイトルメント
  hasPlus: boolean;
  hasPro: boolean;

  // 有効期限
  expirationDate: Date | null;

  // 購入可能なパッケージ
  offerings: PurchasesOffering | null;
  packages: PurchasesPackage[];

  // 顧客情報
  customerInfo: CustomerInfo | null;
}

// フックの戻り値
interface UseRevenueCatReturn extends SubscriptionState {
  // 購入
  purchase: (
    packageToPurchase: PurchasesPackage,
    targetPlan?: 'plus' | 'pro',
    targetPeriod?: 'monthly' | 'annual'
  ) => Promise<boolean>;
  purchasePlus: (period?: 'monthly' | 'annual') => Promise<boolean>;
  purchasePro: (period?: 'monthly' | 'annual') => Promise<boolean>;

  // 復元
  restorePurchases: () => Promise<boolean>;

  // ユーザーID設定
  setUserId: (userId: string) => Promise<void>;
  logout: () => Promise<void>;

  // 再読み込み
  refresh: () => Promise<void>;
}

// モック状態（Web用）
const mockState: SubscriptionState = {
  isLoading: false,
  isInitialized: true,
  error: null,
  currentPlan: 'free',
  hasPlus: false,
  hasPro: false,
  expirationDate: null,
  offerings: null,
  packages: [],
  customerInfo: null,
};

let revenueCatConfigured = false;

function summarizeCustomerInfo(customerInfo: CustomerInfo | null) {
  if (!customerInfo) {
    return null;
  }

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

async function waitForRevenueCatCustomerInfo(
  Purchases: typeof import('@revenuecat/purchases-capacitor').Purchases,
  attempts = 5,
  intervalMs = 1000
): Promise<CustomerInfo> {
  await Purchases.invalidateCustomerInfoCache().catch(() => undefined);
  let customerInfo = (await Purchases.getCustomerInfo()).customerInfo;
  let tier = inferRevenueCatTier(customerInfo);

  for (let attempt = 0; attempt < attempts && tier === 'free'; attempt += 1) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    await Purchases.invalidateCustomerInfoCache().catch(() => undefined);
    customerInfo = (await Purchases.getCustomerInfo()).customerInfo;
    tier = inferRevenueCatTier(customerInfo);
  }

  return customerInfo;
}

/**
 * RevenueCat フック
 *
 * ネイティブアプリでのみ動作し、WebではモックのSubscriptionContextを使用
 */
export function useRevenueCat(): UseRevenueCatReturn {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    isLoading: true,
    isInitialized: false,
    error: null,
    currentPlan: 'free',
    hasPlus: false,
    hasPro: false,
    expirationDate: null,
    offerings: null,
    packages: [],
    customerInfo: null,
  });

  const isNative = Capacitor.isNativePlatform();

  // 顧客情報から状態を更新
  const updateStateFromCustomerInfo = useCallback((customerInfo: CustomerInfo) => {
    const hasPlus = !!customerInfo.entitlements.active[REVENUECAT_CONFIG.ENTITLEMENTS.PLUS];
    const hasPro = !!customerInfo.entitlements.active[REVENUECAT_CONFIG.ENTITLEMENTS.PRO];
    const currentPlan = inferRevenueCatTier(customerInfo);
    const expirationDate = getRevenueCatExpirationDate(customerInfo, currentPlan);

    setState(prev => ({
      ...prev,
      customerInfo,
      hasPlus,
      hasPro,
      currentPlan,
      expirationDate,
    }));

    if (user && !isGuestUser(user)) {
      writeNativeSubscriptionSnapshot({
        userId: user.id,
        tier: currentPlan,
        billingPeriod: inferRevenueCatBillingPeriod(customerInfo, currentPlan),
        expiresAt: expirationDate?.toISOString() || null,
        updatedAt: new Date().toISOString(),
      });
    }

    appendSubscriptionDebugLog('useRevenueCat', 'customer_info_updated', {
      currentPlan,
      expirationDate: expirationDate?.toISOString() || null,
      customerInfo: summarizeCustomerInfo(customerInfo),
    });
  }, [user]);

  const ensurePurchasesReady = useCallback(async () => {
    if (isAuthLoading) {
      throw new Error('Authentication is still loading');
    }

    if (!user || isGuestUser(user)) {
      throw new Error('Authenticated user is required for RevenueCat');
    }

    const { Purchases } = await import('@revenuecat/purchases-capacitor');

    const apiKey = Capacitor.getPlatform() === 'ios'
      ? REVENUECAT_CONFIG.API_KEY_IOS
      : REVENUECAT_CONFIG.API_KEY_ANDROID;

    if (!apiKey) {
      appendSubscriptionDebugLog('useRevenueCat', 'configure_missing_api_key');
      throw new Error('RevenueCat API key is not configured');
    }

    if (!revenueCatConfigured) {
      await Purchases.configure({
        apiKey,
        appUserID: user.id,
      });
      revenueCatConfigured = true;
      appendSubscriptionDebugLog('useRevenueCat', 'configured', {
        platform: Capacitor.getPlatform(),
        userId: user.id,
      });

      const firebaseAppInstanceId = await getAppInstanceId();
      if (firebaseAppInstanceId) {
        await Purchases.setFirebaseAppInstanceID({
          firebaseAppInstanceID: firebaseAppInstanceId,
        });
        appendSubscriptionDebugLog('useRevenueCat', 'firebase_app_instance_id_set', {
          userId: user.id,
        });
      }
    }

    await Purchases.logIn({ appUserID: user.id });
    appendSubscriptionDebugLog('useRevenueCat', 'login', { userId: user.id });

    return { Purchases };
  }, [isAuthLoading, user]);

  // RevenueCatの初期化
  useEffect(() => {
    if (!isNative) {
      // Web環境ではモック状態を使用
      setState(mockState);
      return;
    }

    if (isAuthLoading) {
      setState(prev => ({
        ...prev,
        isLoading: true,
        isInitialized: false,
      }));
      return;
    }

    if (!user || isGuestUser(user)) {
      clearNativeSubscriptionSnapshot();
      setState({
        ...mockState,
        isLoading: false,
        isInitialized: false,
      });
      return;
    }

    let listenerId: string | null = null;
    let cancelled = false;

    const initializeRevenueCat = async () => {
      try {
        const { Purchases } = await ensurePurchasesReady();
        listenerId = await Purchases.addCustomerInfoUpdateListener((customerInfo) => {
          if (cancelled) {
            return;
          }

          updateStateFromCustomerInfo(customerInfo);
          setState(prev => ({
            ...prev,
            isInitialized: true,
            isLoading: false,
          }));
        });
        const { customerInfo } = await Purchases.getCustomerInfo();
        const hasPlus = !!customerInfo.entitlements.active[REVENUECAT_CONFIG.ENTITLEMENTS.PLUS];
        const hasPro = !!customerInfo.entitlements.active[REVENUECAT_CONFIG.ENTITLEMENTS.PRO];
        const currentPlan = inferRevenueCatTier(customerInfo);
        const expirationDate = getRevenueCatExpirationDate(customerInfo, currentPlan);

        setState(prev => ({
          ...prev,
          customerInfo,
          hasPlus,
          hasPro,
          currentPlan,
          expirationDate,
        }));
        const offerings = await Purchases.getOfferings();
        appendSubscriptionDebugLog('useRevenueCat', 'initialized', {
          userId: user.id,
          currentPlan,
          offeringsCount: offerings.current?.availablePackages?.length || 0,
          customerInfo: summarizeCustomerInfo(customerInfo),
        });

        if (offerings.current) {
          setState(prev => ({
            ...prev,
            offerings: offerings.current,
            packages: offerings.current?.availablePackages || [],
          }));
        }

        setState(prev => ({
          ...prev,
          isInitialized: true,
          isLoading: false,
        }));
      } catch (error) {
        console.error('Failed to initialize RevenueCat:', error);
        appendSubscriptionDebugLog('useRevenueCat', 'initialize_failed', error);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to initialize',
        }));
      }
    };

    void initializeRevenueCat();
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
          console.warn('Failed to remove RevenueCat listener:', error);
        }
      })();
    };
  }, [ensurePurchasesReady, isAuthLoading, isNative, updateStateFromCustomerInfo, user]);

  // 購入可能なパッケージを取得
  const fetchOfferings = useCallback(async () => {
    if (!isNative) return;

    try {
      const { Purchases } = await ensurePurchasesReady();
      const offerings = await Purchases.getOfferings();
      appendSubscriptionDebugLog('useRevenueCat', 'offerings_fetched', {
        offeringsCount: offerings.current?.availablePackages?.length || 0,
      });

      if (offerings.current) {
        setState(prev => ({
          ...prev,
          offerings: offerings.current,
          packages: offerings.current?.availablePackages || [],
        }));
      }
    } catch (error) {
      console.error('Failed to fetch offerings:', error);
      appendSubscriptionDebugLog('useRevenueCat', 'offerings_fetch_failed', error);
    }
  }, [ensurePurchasesReady, isNative]);

  // 情報を更新
  const refresh = useCallback(async () => {
    if (!isNative) return;

    try {
      const { Purchases } = await ensurePurchasesReady();
      const { customerInfo } = await Purchases.getCustomerInfo();
      appendSubscriptionDebugLog('useRevenueCat', 'refresh_customer_info', {
        customerInfo: summarizeCustomerInfo(customerInfo),
      });
      updateStateFromCustomerInfo(customerInfo);
      await fetchOfferings();
    } catch (error) {
      console.error('Failed to refresh customer info:', error);
      appendSubscriptionDebugLog('useRevenueCat', 'refresh_failed', error);
    }
  }, [ensurePurchasesReady, fetchOfferings, isNative, updateStateFromCustomerInfo]);

  const getGoogleProrationMode = useCallback((
    customerInfo: CustomerInfo,
    targetPlan: 'plus' | 'pro',
    targetPeriod: 'monthly' | 'annual'
  ): PRORATION_MODE | null => {
    const currentPlan = inferRevenueCatTier(customerInfo);
    const currentPeriod = inferRevenueCatBillingPeriod(customerInfo, currentPlan);

    if (currentPlan === 'free' || currentPeriod === null) {
      return null;
    }

    if (currentPlan === 'plus' && targetPlan === 'pro') {
      return PRORATION_MODE.IMMEDIATE_AND_CHARGE_PRORATED_PRICE;
    }

    if (currentPlan === targetPlan && currentPeriod === targetPeriod) {
      return null;
    }

    if (currentPlan === targetPlan && currentPeriod === 'monthly' && targetPeriod === 'annual') {
      return PRORATION_MODE.IMMEDIATE_AND_CHARGE_FULL_PRICE;
    }

    return PRORATION_MODE.IMMEDIATE_WITHOUT_PRORATION;
  }, []);

  // 購入処理
  const purchase = useCallback(async (
    packageToPurchase: PurchasesPackage,
    targetPlan?: 'plus' | 'pro',
    targetPeriod?: 'monthly' | 'annual'
  ): Promise<boolean> => {
    if (!isNative) {
      console.warn('Purchase is only available on native platforms');
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    appendSubscriptionDebugLog('useRevenueCat', 'purchase_started', {
      packageIdentifier: packageToPurchase.identifier,
      productIdentifier: packageToPurchase.product.identifier,
      targetPlan: targetPlan || null,
      targetPeriod: targetPeriod || null,
      userId: user && !isGuestUser(user) ? user.id : null,
    });

    try {
      const { Purchases } = await ensurePurchasesReady();
      let googleProductChangeInfo: {
        oldProductIdentifier: string;
        prorationMode?: PRORATION_MODE;
      } | null = null;

      if (Capacitor.getPlatform() === 'android' && targetPlan && targetPeriod) {
        const { customerInfo: currentCustomerInfo } = await Purchases.getCustomerInfo();
        const oldProductIdentifier = getCurrentRevenueCatProductIdentifier(currentCustomerInfo);
        const prorationMode = getGoogleProrationMode(currentCustomerInfo, targetPlan, targetPeriod);

        if (oldProductIdentifier && oldProductIdentifier !== packageToPurchase.product.identifier) {
          googleProductChangeInfo = {
            oldProductIdentifier,
            ...(prorationMode !== null ? { prorationMode } : {}),
          };
        }
      }

      const { customerInfo } = await Purchases.purchasePackage({
        aPackage: packageToPurchase,
        ...(googleProductChangeInfo ? { googleProductChangeInfo } : {}),
      });
      appendSubscriptionDebugLog('useRevenueCat', 'purchase_succeeded', {
        packageIdentifier: packageToPurchase.identifier,
        productIdentifier: packageToPurchase.product.identifier,
        currentPlan: inferRevenueCatTier(customerInfo),
        customerInfo: summarizeCustomerInfo(customerInfo),
      });

      updateStateFromCustomerInfo(customerInfo);
      setState(prev => ({ ...prev, isLoading: false }));

      // Analytics: サブスクリプション開始イベント
      const productId = packageToPurchase.product.identifier;
      const inferredPlan = inferRevenueCatTier(customerInfo);
      const plan: 'plus' | 'pro' = inferredPlan === 'free'
        ? (productId.includes('pro') ? 'pro' : 'plus')
        : inferredPlan;
      const period = inferRevenueCatBillingPeriod(customerInfo, plan) || 'monthly';
      const price = packageToPurchase.product.price;
      logSubscriptionStart(plan, period, price);

      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Purchase failed';

      // ユーザーがキャンセルした場合
      if (errorMessage.includes('cancelled') || errorMessage.includes('canceled')) {
        appendSubscriptionDebugLog('useRevenueCat', 'purchase_cancelled', {
          packageIdentifier: packageToPurchase.identifier,
          productIdentifier: packageToPurchase.product.identifier,
        });
        setState(prev => ({ ...prev, isLoading: false }));
        return false;
      }

      console.error('Purchase failed:', error);
      appendSubscriptionDebugLog('useRevenueCat', 'purchase_failed', {
        packageIdentifier: packageToPurchase.identifier,
        productIdentifier: packageToPurchase.product.identifier,
        error,
      });
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return false;
    }
  }, [ensurePurchasesReady, getGoogleProrationMode, isNative, updateStateFromCustomerInfo]);

  // Plusプランを購入
  const purchasePlus = useCallback(async (period: 'monthly' | 'annual' = 'monthly'): Promise<boolean> => {
    const plusPackage = state.packages.find((pkg) => packageMatchesPlan(pkg, 'plus', period));

    if (!plusPackage) {
      console.error(`Plus ${period} package not found`);
      setState(prev => ({
        ...prev,
        error: 'ストアに接続できません。ネットワーク接続を確認してください。',
      }));
      return false;
    }

    return purchase(plusPackage, 'plus', period);
  }, [state.packages, purchase]);

  // Proプランを購入
  const purchasePro = useCallback(async (period: 'monthly' | 'annual' = 'monthly'): Promise<boolean> => {
    const proPackage = state.packages.find((pkg) => packageMatchesPlan(pkg, 'pro', period));

    if (!proPackage) {
      console.error(`Pro ${period} package not found`);
      setState(prev => ({
        ...prev,
        error: 'ストアに接続できません。ネットワーク接続を確認してください。',
      }));
      return false;
    }

    return purchase(proPackage, 'pro', period);
  }, [state.packages, purchase]);

  // 購入を復元
  const restorePurchases = useCallback(async (): Promise<boolean> => {
    if (!isNative) return false;

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    appendSubscriptionDebugLog('useRevenueCat', 'restore_started', {
      userId: user?.id || null,
    });

    try {
      const { Purchases } = await ensurePurchasesReady();
      let { customerInfo } = await Purchases.restorePurchases();
      let currentPlan = inferRevenueCatTier(customerInfo);
      appendSubscriptionDebugLog('useRevenueCat', 'restore_result_initial', {
        currentPlan,
        customerInfo: summarizeCustomerInfo(customerInfo),
      });

      if (currentPlan === 'free') {
        await Purchases.syncPurchases().catch(() => undefined);
        customerInfo = await waitForRevenueCatCustomerInfo(Purchases, 6, 1200);
        currentPlan = inferRevenueCatTier(customerInfo);
        appendSubscriptionDebugLog('useRevenueCat', 'restore_result_after_sync', {
          currentPlan,
          customerInfo: summarizeCustomerInfo(customerInfo),
        });
      }

      updateStateFromCustomerInfo(customerInfo);
      setState(prev => ({ ...prev, isLoading: false }));
      return currentPlan !== 'free';
    } catch (error) {
      console.error('Failed to restore purchases:', error);
      appendSubscriptionDebugLog('useRevenueCat', 'restore_failed', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Restore failed',
      }));
      return false;
    }
  }, [ensurePurchasesReady, isNative, updateStateFromCustomerInfo]);

  // ユーザーIDを設定
  const setUserId = useCallback(async (userId: string) => {
    if (!isNative) return;

    try {
      const { Purchases } = await ensurePurchasesReady();
      await Purchases.logIn({ appUserID: userId });
      appendSubscriptionDebugLog('useRevenueCat', 'set_user_id', { userId });
      await refresh();
    } catch (error) {
      console.error('Failed to set user ID:', error);
      appendSubscriptionDebugLog('useRevenueCat', 'set_user_id_failed', { userId, error });
    }
  }, [ensurePurchasesReady, isNative, refresh]);

  // ログアウト
  const logout = useCallback(async () => {
    if (!isNative) return;

    try {
      const { Purchases } = await ensurePurchasesReady();
      await Purchases.logOut();
      clearNativeSubscriptionSnapshot();
      appendSubscriptionDebugLog('useRevenueCat', 'logout');
      setState(prev => ({
        ...prev,
        currentPlan: 'free',
        hasPlus: false,
        hasPro: false,
        expirationDate: null,
        customerInfo: null,
      }));
    } catch (error) {
      console.error('Failed to logout:', error);
      appendSubscriptionDebugLog('useRevenueCat', 'logout_failed', error);
    }
  }, [ensurePurchasesReady, isNative]);

  return {
    ...state,
    purchase,
    purchasePlus,
    purchasePro,
    restorePurchases,
    setUserId,
    logout,
    refresh,
  };
}

// 設定をエクスポート
export { REVENUECAT_CONFIG };
