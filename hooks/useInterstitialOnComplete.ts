'use client';

import { useCallback, useRef } from 'react';
import { useAdMob } from '@/hooks/useAdMob';
import { useSubscription } from '@/contexts/SubscriptionContext';

/**
 * レッスン完了時にインタースティシャル広告を表示するフック
 * 無料ユーザーのみ表示、プレミアムユーザーはスキップ
 */
export function useInterstitialOnComplete() {
  const { showInterstitialAd } = useAdMob();
  const { shouldShowAds } = useSubscription();
  const shownRef = useRef(false);

  const showLessonCompleteAd = useCallback(async () => {
    // プレミアムユーザーは広告なし
    if (!shouldShowAds()) return;
    // 同一レッスンで複数回表示しない
    if (shownRef.current) return;
    shownRef.current = true;

    await showInterstitialAd();
  }, [showInterstitialAd, shouldShowAds]);

  const resetAdShown = useCallback(() => {
    shownRef.current = false;
  }, []);

  return { showLessonCompleteAd, resetAdShown };
}
