'use client';

import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import type { CustomerInfo, PurchasesPackage, PurchasesOffering } from '@revenuecat/purchases-capacitor';
import { PRORATION_MODE } from '@revenuecat/purchases-capacitor';
import { getAppInstanceId, logSubscriptionStart } from '@/utils/analytics';
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

/**
 * RevenueCat フック
 *
 * ネイティブアプリでのみ動作し、WebではモックのSubscriptionContextを使用
 */
export function useRevenueCat(): UseRevenueCatReturn {
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

  // RevenueCatの初期化
  useEffect(() => {
    if (!isNative) {
      // Web環境ではモック状態を使用
      setState(mockState);
      return;
    }

    const initializeRevenueCat = async () => {
      try {
        // 動的インポート（ネイティブでのみ利用可能）
        const { Purchases } = await import('@revenuecat/purchases-capacitor');

        // プラットフォームに応じたAPIキーを使用
        const apiKey = Capacitor.getPlatform() === 'ios'
          ? REVENUECAT_CONFIG.API_KEY_IOS
          : REVENUECAT_CONFIG.API_KEY_ANDROID;

        if (!apiKey) {
          throw new Error('RevenueCat API key is not configured');
        }

        // RevenueCatを設定
        await Purchases.configure({
          apiKey,
        });

        // Firebase Analytics との連携
        const firebaseAppInstanceId = await getAppInstanceId();
        if (firebaseAppInstanceId) {
          await Purchases.setFirebaseAppInstanceID({
            firebaseAppInstanceID: firebaseAppInstanceId,
          });
        }

        // 初期情報を取得
        await refresh();

        setState(prev => ({
          ...prev,
          isInitialized: true,
          isLoading: false,
        }));
      } catch (error) {
        console.error('Failed to initialize RevenueCat:', error);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to initialize',
        }));
      }
    };

    initializeRevenueCat();
  }, [isNative]);

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
  }, []);

  // 購入可能なパッケージを取得
  const fetchOfferings = useCallback(async () => {
    if (!isNative) return;

    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const offerings = await Purchases.getOfferings();

      if (offerings.current) {
        setState(prev => ({
          ...prev,
          offerings: offerings.current,
          packages: offerings.current?.availablePackages || [],
        }));
      }
    } catch (error) {
      console.error('Failed to fetch offerings:', error);
    }
  }, [isNative]);

  // 情報を更新
  const refresh = useCallback(async () => {
    if (!isNative) return;

    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const { customerInfo } = await Purchases.getCustomerInfo();
      updateStateFromCustomerInfo(customerInfo);
      await fetchOfferings();
    } catch (error) {
      console.error('Failed to refresh customer info:', error);
    }
  }, [isNative, updateStateFromCustomerInfo, fetchOfferings]);

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

    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
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
        setState(prev => ({ ...prev, isLoading: false }));
        return false;
      }

      console.error('Purchase failed:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return false;
    }
  }, [getGoogleProrationMode, isNative, updateStateFromCustomerInfo]);

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

    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const { customerInfo } = await Purchases.restorePurchases();
      updateStateFromCustomerInfo(customerInfo);
      setState(prev => ({ ...prev, isLoading: false }));
      return true;
    } catch (error) {
      console.error('Failed to restore purchases:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Restore failed',
      }));
      return false;
    }
  }, [isNative, updateStateFromCustomerInfo]);

  // ユーザーIDを設定
  const setUserId = useCallback(async (userId: string) => {
    if (!isNative) return;

    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      await Purchases.logIn({ appUserID: userId });
      await refresh();
    } catch (error) {
      console.error('Failed to set user ID:', error);
    }
  }, [isNative, refresh]);

  // ログアウト
  const logout = useCallback(async () => {
    if (!isNative) return;

    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      await Purchases.logOut();
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
    }
  }, [isNative]);

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
