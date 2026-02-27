'use client';

import { useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAdMob } from '@/hooks/useAdMob';

interface RewardVideoAdProps {
  onRewardEarned?: () => void;
  onAdClosed?: () => void;
  children?: React.ReactNode;
  className?: string;
  triggerText?: string;
  disabled?: boolean;
}

type AdState = 'idle' | 'loading' | 'playing' | 'completed' | 'error';

export default function RewardVideoAd({
  onRewardEarned,
  onAdClosed,
  children,
  className = '',
  triggerText = '動画を見てボーナスを獲得',
  disabled = false,
}: RewardVideoAdProps) {
  const { shouldShowAds } = useSubscription();
  const { showRewardedAd, isNative } = useAdMob();
  const [adState, setAdState] = useState<AdState>('idle');
  const [progress, setProgress] = useState(0);

  const showAds = shouldShowAds();

  const handleWatchAd = useCallback(async () => {
    if (disabled || adState !== 'idle' || !showAds) return;

    // ネイティブ環境：AdMobリワード広告を表示
    if (isNative) {
      setAdState('loading');
      const earned = await showRewardedAd();
      if (earned) {
        setAdState('completed');
        onRewardEarned?.();
        setTimeout(() => {
          setAdState('idle');
          onAdClosed?.();
        }, 1000);
      } else {
        setAdState('idle');
        onAdClosed?.();
      }
      return;
    }

    // Web環境：デモ用シミュレート（開発確認用）
    setAdState('loading');
    setProgress(0);

    setTimeout(() => {
      setAdState('playing');

      const duration = 5000;
      const interval = 100;
      let elapsed = 0;

      const timer = setInterval(() => {
        elapsed += interval;
        setProgress((elapsed / duration) * 100);

        if (elapsed >= duration) {
          clearInterval(timer);
          setAdState('completed');
          onRewardEarned?.();

          setTimeout(() => {
            setAdState('idle');
            setProgress(0);
            onAdClosed?.();
          }, 1000);
        }
      }, interval);
    }, 1000);
  }, [disabled, adState, onRewardEarned, onAdClosed, showAds, isNative, showRewardedAd]);

  // プレミアムユーザーには表示しない
  if (!showAds) {
    return null;
  }

  // カスタムトリガー要素がある場合
  if (children) {
    return (
      <div onClick={handleWatchAd} className={className}>
        {children}
      </div>
    );
  }

  return (
    <button
      onClick={handleWatchAd}
      disabled={disabled || adState !== 'idle'}
      className={`
        w-full py-3 px-4 rounded-xl font-bold text-sm
        bg-gradient-to-r from-amber-400 to-orange-500 text-white
        active:scale-[0.98] transition-all
        disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center justify-center gap-2
        ${className}
      `}
    >
      {adState === 'idle' && (
        <>
          <span className="text-lg">🎬</span>
          {triggerText}
        </>
      )}
      {adState === 'loading' && (
        <>
          <span className="animate-spin">⏳</span>
          {isNative ? '広告を読み込み中...' : '読み込み中...'}
        </>
      )}
      {adState === 'playing' && !isNative && (
        <div className="w-full">
          <div className="flex items-center justify-between mb-1">
            <span>広告再生中...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-2 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
      {adState === 'completed' && (
        <>
          <span className="text-lg">✅</span>
          報酬を獲得しました！
        </>
      )}
      {adState === 'error' && (
        <>
          <span className="text-lg">❌</span>
          エラーが発生しました
        </>
      )}
    </button>
  );
}

// 広告視聴で機能をアンロックするパターン
interface AdUnlockButtonProps {
  featureName: string;
  onUnlocked: () => void;
  className?: string;
}

export function AdUnlockButton({
  featureName,
  onUnlocked,
  className = '',
}: AdUnlockButtonProps) {
  const { shouldShowAds } = useSubscription();

  if (!shouldShowAds()) {
    return null;
  }

  return (
    <div className={`bg-amber-50 rounded-2xl p-4 border border-amber-200 ${className}`}>
      <div className="text-center mb-3">
        <p className="text-sm font-bold text-gray-800 mb-1">
          {featureName}を無料で試す
        </p>
        <p className="text-xs text-gray-500">
          動画広告を見ると1回無料で利用できます
        </p>
      </div>
      <RewardVideoAd
        onRewardEarned={onUnlocked}
        triggerText="動画を見て無料で試す"
      />
    </div>
  );
}
