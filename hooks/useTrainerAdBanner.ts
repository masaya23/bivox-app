'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useAd } from '@/contexts/AdContext';
import { ADMOB_CONFIG, IS_ADMOB_TEST_MODE } from '@/hooks/useAdMob';

/**
 * トレーニング画面用のバナー広告位置調整フック
 * BottomNavがないため、バナーのマージンを0にして画面最下部に配置する
 * 画面離脱時はバナーを削除し、次画面のFixedAdBannerに再表示を任せる
 */
export function useTrainerAdBanner() {
  const { shouldShowAds } = useAd();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const adId = Capacitor.getPlatform() === 'ios'
      ? ADMOB_CONFIG.BANNER_ID_IOS
      : ADMOB_CONFIG.BANNER_ID_ANDROID;

    const removeBanner = async () => {
      try {
        const { AdMob } = await import('@capacitor-community/admob');
        await AdMob.removeBanner();
      } catch {
        // ignore
      }
    };

    const repositionBanner = async () => {
      if (!shouldShowAds) {
        await removeBanner();
        return;
      }

      try {
        const { AdMob, BannerAdSize, BannerAdPosition } = await import('@capacitor-community/admob');
        await AdMob.removeBanner();
        await AdMob.showBanner({
          adId,
          adSize: BannerAdSize.ADAPTIVE_BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          margin: 0,
          isTesting: IS_ADMOB_TEST_MODE,
        });
      } catch { /* ignore */ }
    };
    repositionBanner();

    // クリーンアップ: バナーを削除のみ（次画面のFixedAdBannerが再表示する）
    return () => {
      removeBanner();
    };
  }, [shouldShowAds]);
}
