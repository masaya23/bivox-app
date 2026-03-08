'use client';

import { useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAdMob } from '@/hooks/useAdMob';

// リワード広告の1日あたり視聴回数制限
const DAILY_REWARD_AD_LIMIT = 3;
const REWARD_AD_STORAGE_KEY = 'reward_ad_daily_count';

function getTodayJST(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

function getDailyAdCount(): number {
  try {
    const data = localStorage.getItem(REWARD_AD_STORAGE_KEY);
    if (!data) return 0;
    const parsed = JSON.parse(data);
    if (parsed.date !== getTodayJST()) return 0;
    return parsed.count || 0;
  } catch {
    return 0;
  }
}

function incrementDailyAdCount(): void {
  const today = getTodayJST();
  const current = getDailyAdCount();
  localStorage.setItem(REWARD_AD_STORAGE_KEY, JSON.stringify({ date: today, count: current + 1 }));
}

function canWatchRewardAd(): boolean {
  return getDailyAdCount() < DAILY_REWARD_AD_LIMIT;
}

function getRemainingAdCount(): number {
  return Math.max(0, DAILY_REWARD_AD_LIMIT - getDailyAdCount());
}

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

    // 1日の視聴回数制限チェック
    if (!canWatchRewardAd()) return;

    // ネイティブ環境：AdMobリワード広告を表示
    if (isNative) {
      setAdState('loading');
      const earned = await showRewardedAd();
      if (earned) {
        incrementDailyAdCount();
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
          incrementDailyAdCount();
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

  const remaining = getRemainingAdCount();
  const limitReached = remaining <= 0;

  // プレミアムユーザーには表示しない
  if (!showAds) {
    return null;
  }

  // 1日の上限に達した場合
  if (limitReached) {
    return (
      <div className={`w-full py-3 px-4 rounded-xl font-bold text-sm bg-gray-300 text-gray-500 text-center ${className}`}>
        本日の広告視聴回数に達しました（{DAILY_REWARD_AD_LIMIT}回/日）
      </div>
    );
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
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/></svg>
          {triggerText}（残り{remaining}回）
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
