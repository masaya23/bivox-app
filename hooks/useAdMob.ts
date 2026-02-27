'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';

// AdMob広告ユニットID設定
const ADMOB_CONFIG = {
  BANNER_ID_ANDROID: process.env.NEXT_PUBLIC_ADMOB_BANNER_ID_ANDROID || 'ca-app-pub-3992336575084323/3513915466',
  BANNER_ID_IOS: process.env.NEXT_PUBLIC_ADMOB_BANNER_ID_IOS || 'ca-app-pub-3992336575084323/9456507288',
  REWARDED_ID_ANDROID: process.env.NEXT_PUBLIC_ADMOB_REWARDED_ID_ANDROID || 'ca-app-pub-3992336575084323/4587323980',
  REWARDED_ID_IOS: process.env.NEXT_PUBLIC_ADMOB_REWARDED_ID_IOS || 'ca-app-pub-3992336575084323/7261588786',
};

export type BannerPosition = 'TOP' | 'BOTTOM';

interface UseAdMobReturn {
  isNative: boolean;
  isInitialized: boolean;
  // バナー広告
  showBanner: (position?: BannerPosition) => Promise<void>;
  hideBanner: () => Promise<void>;
  // リワード広告
  showRewardedAd: () => Promise<boolean>;
  isRewardedAdLoading: boolean;
}

export function useAdMob(): UseAdMobReturn {
  const isNative = Capacitor.isNativePlatform();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRewardedAdLoading, setIsRewardedAdLoading] = useState(false);
  const admobRef = useRef<typeof import('@capacitor-community/admob').AdMob | null>(null);

  // AdMob初期化
  useEffect(() => {
    if (!isNative) {
      setIsInitialized(true);
      return;
    }

    const init = async () => {
      try {
        const { AdMob } = await import('@capacitor-community/admob');
        admobRef.current = AdMob;

        await AdMob.initialize({
          // テストデバイスの場合
          initializeForTesting: true,
        });

        setIsInitialized(true);
      } catch (error) {
        console.error('AdMob initialization failed:', error);
        // 初期化失敗してもアプリは動作させる
        setIsInitialized(true);
      }
    };

    init();
  }, [isNative]);

  // バナー広告表示
  const showBanner = useCallback(async (position: BannerPosition = 'BOTTOM') => {
    if (!isNative || !admobRef.current) return;

    try {
      const { BannerAdSize, BannerAdPosition } = await import('@capacitor-community/admob');
      const adId = Capacitor.getPlatform() === 'ios'
        ? ADMOB_CONFIG.BANNER_ID_IOS
        : ADMOB_CONFIG.BANNER_ID_ANDROID;

      await admobRef.current.showBanner({
        adId,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: position === 'TOP' ? BannerAdPosition.TOP_CENTER : BannerAdPosition.BOTTOM_CENTER,
        margin: position === 'BOTTOM' ? 68 : 0, // BottomNavの高さ分のマージン
        isTesting: true, // 本番リリース時にfalseに変更
      });
    } catch (error) {
      console.error('Failed to show banner ad:', error);
    }
  }, [isNative]);

  // バナー広告非表示
  const hideBanner = useCallback(async () => {
    if (!isNative || !admobRef.current) return;

    try {
      await admobRef.current.hideBanner();
    } catch (error) {
      console.error('Failed to hide banner ad:', error);
    }
  }, [isNative]);

  // リワード広告表示
  const showRewardedAd = useCallback(async (): Promise<boolean> => {
    if (!isNative || !admobRef.current) return false;

    setIsRewardedAdLoading(true);

    try {
      const { AdMob, RewardAdPluginEvents } = await import('@capacitor-community/admob');
      const adId = Capacitor.getPlatform() === 'ios'
        ? ADMOB_CONFIG.REWARDED_ID_IOS
        : ADMOB_CONFIG.REWARDED_ID_ANDROID;

      // リワード広告を準備
      await AdMob.prepareRewardVideoAd({
        adId,
        isTesting: true, // 本番リリース時にfalseに変更
      });

      // リワード取得をPromiseで待機
      const rewardEarned = await new Promise<boolean>((resolve) => {
        let resolved = false;
        const safeResolve = (value: boolean) => {
          if (!resolved) {
            resolved = true;
            resolve(value);
          }
        };

        // イベントリスナーを設定
        const listeners: { remove: () => Promise<void> }[] = [];

        AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
          safeResolve(true);
        }).then(h => listeners.push(h));

        AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
          safeResolve(false);
        }).then(h => listeners.push(h));

        AdMob.addListener(RewardAdPluginEvents.FailedToLoad, () => {
          safeResolve(false);
        }).then(h => listeners.push(h));

        AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => {
          safeResolve(false);
        }).then(h => listeners.push(h));

        // 広告を表示
        AdMob.showRewardVideoAd().catch(() => {
          safeResolve(false);
        });

        // 30秒タイムアウト
        setTimeout(() => {
          safeResolve(false);
        }, 30000);
      });

      setIsRewardedAdLoading(false);
      return rewardEarned;
    } catch (error) {
      console.error('Failed to show rewarded ad:', error);
      setIsRewardedAdLoading(false);
      return false;
    }
  }, [isNative]);

  return {
    isNative,
    isInitialized,
    showBanner,
    hideBanner,
    showRewardedAd,
    isRewardedAdLoading,
  };
}

export { ADMOB_CONFIG };
