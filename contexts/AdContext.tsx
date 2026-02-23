'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useSubscription } from './SubscriptionContext';

// 広告表示の設定定数
const AD_CONFIG = {
  // バナー広告の高さ（px）
  BANNER_HEIGHT: 50,
};

interface AdState {
  // バナー広告を非表示にするか（レッスン中など）
  isBannerHidden: boolean;
}

interface AdContextType extends AdState {
  // バナー広告の表示/非表示を切り替え
  setBannerHidden: (hidden: boolean) => void;
  // 広告を表示すべきか（プランに基づく）
  shouldShowAds: boolean;
  // バナー広告の高さを取得
  getBannerHeight: () => number;
  // デバッグ用：バナー広告を強制表示
  debugForceShowBanner: boolean;
  setDebugForceShowBanner: (show: boolean) => void;
}

const AdContext = createContext<AdContextType | undefined>(undefined);

export function AdProvider({ children }: { children: ReactNode }) {
  const { isMasterAccount, getEffectiveTier, debugOverridePlan } = useSubscription();

  // デバッグ用：バナー広告を強制表示
  const [debugForceShowBanner, setDebugForceShowBannerState] = useState(false);

  // 有効なプランを取得（デバッグオーバーライド考慮）
  const effectiveTier = getEffectiveTier();

  // 広告表示の判定（デバッグオーバーライド考慮）
  const shouldShowAds = (() => {
    // デバッグ強制表示が有効な場合は常に表示
    if (isMasterAccount && debugForceShowBanner) return true;
    // デバッグプランオーバーライドが設定されている場合
    if (isMasterAccount && debugOverridePlan !== null) {
      return debugOverridePlan === 'free';
    }
    // 通常のロジック
    return effectiveTier === 'free' && !isMasterAccount;
  })();

  const [state, setState] = useState<AdState>({
    isBannerHidden: false,
  });

  // バナー広告の表示/非表示を切り替え
  const setBannerHidden = useCallback((hidden: boolean) => {
    setState(prev => ({ ...prev, isBannerHidden: hidden }));
  }, []);

  // バナー広告の高さを取得
  const getBannerHeight = useCallback((): number => {
    return shouldShowAds && !state.isBannerHidden ? AD_CONFIG.BANNER_HEIGHT : 0;
  }, [shouldShowAds, state.isBannerHidden]);

  // デバッグ用：バナー広告を強制表示
  const setDebugForceShowBanner = useCallback((show: boolean) => {
    setDebugForceShowBannerState(show);
  }, []);

  const value: AdContextType = {
    ...state,
    setBannerHidden,
    shouldShowAds,
    getBannerHeight,
    debugForceShowBanner,
    setDebugForceShowBanner,
  };

  return (
    <AdContext.Provider value={value}>
      {children}
    </AdContext.Provider>
  );
}

export function useAd(): AdContextType {
  const context = useContext(AdContext);
  if (context === undefined) {
    throw new Error('useAd must be used within an AdProvider');
  }
  return context;
}

// 広告設定をエクスポート
export { AD_CONFIG };
