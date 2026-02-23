'use client';

import { useUsageLimit, UsageType, USAGE_LIMITS } from '@/contexts/UsageLimitContext';
import { useSubscription } from '@/contexts/SubscriptionContext';

interface UsageLimitDialogProps {
  onClose?: () => void;
}

export default function UsageLimitDialog({ onClose }: UsageLimitDialogProps) {
  const { showLimitDialog, closeLimitDialog, limitDialogType, dailyUsage } = useUsageLimit();
  const { tier } = useSubscription();

  const handleClose = () => {
    closeLimitDialog();
    onClose?.();
  };

  if (!showLimitDialog || !limitDialogType) return null;

  // SVGアイコンレンダラー
  const renderIcon = (type: UsageType) => {
    if (type === 'speaking') {
      return (
        <svg width={48} height={48} viewBox="0 0 24 24" fill="white">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z" />
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
        </svg>
      );
    }
    return (
      <svg width={48} height={48} viewBox="0 0 24 24" fill="white">
        <path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zM7.5 11.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5S9.83 13 9 13s-1.5-.67-1.5-1.5zM16 17H8v-2h8v2zm-1-4c-.83 0-1.5-.67-1.5-1.5S14.17 10 15 10s1.5.67 1.5 1.5S15.83 13 15 13z" />
      </svg>
    );
  };

  // タイプに応じたメッセージを取得
  const getDialogContent = (type: UsageType) => {
    switch (type) {
      case 'speaking':
        return {
          title: 'スピーキング判定の上限',
          limit: USAGE_LIMITS.PLUS_SPEAKING_DAILY_LIMIT,
          used: dailyUsage.speaking,
          feature: 'スピーキング判定',
          upgrade: tier === 'plus' ? 'Proプランで無制限に' : 'Plusプランで50回/日',
        };
      case 'ai-drill':
      case 'ai-conversation':
        return {
          title: 'AI機能の上限',
          limit: USAGE_LIMITS.PRO_AI_DAILY_LIMIT,
          used: dailyUsage.aiTotal,
          feature: 'AI応用ドリル・AIとフリー英会話',
          upgrade: '上限は毎日リセットされます',
        };
      default:
        return {
          title: '利用上限',
          limit: 0,
          used: 0,
          feature: '機能',
          upgrade: '',
        };
    }
  };

  const content = getDialogContent(limitDialogType);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-8 text-center text-white relative overflow-hidden">
          {/* 背景装飾 */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-6 -left-6 w-32 h-32 bg-white rounded-full" />
            <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-white rounded-full" />
          </div>

          <div className="relative z-10">
            <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-2xl mx-auto mb-4 flex items-center justify-center">
              {renderIcon(limitDialogType)}
            </div>
            <h2 className="text-xl font-black mb-2">
              本日の学習上限に達しました
            </h2>
            <p className="text-white/90 text-sm">
              素晴らしい集中力です！
            </p>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="px-6 py-6">
          {/* 使用状況 */}
          <div className="bg-gray-50 rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-gray-700">{content.feature}</span>
              <span className="text-sm text-gray-500">
                {content.used} / {content.limit}回
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* メッセージ */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-full mb-3">
              <span className="text-amber-500">🕐</span>
              <span className="text-amber-700 text-sm font-medium">
                毎日0時にリセットされます
              </span>
            </div>
            <p className="text-gray-600 text-sm">
              続きはまた明日行いましょう。<br />
              今日の学習お疲れさまでした！
            </p>
          </div>

          {/* ボタン */}
          <button
            onClick={handleClose}
            className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-2xl active:scale-[0.98] transition-transform"
          >
            わかりました
          </button>
        </div>
      </div>
    </div>
  );
}

// 利用前チェック用フック
export function useUsageCheck() {
  const { canUse, incrementUsage, getRemainingCount, isLimitReached } = useUsageLimit();

  const checkAndIncrement = (type: UsageType): boolean => {
    if (!canUse(type)) {
      return false;
    }
    return incrementUsage(type);
  };

  return {
    canUse,
    checkAndIncrement,
    getRemainingCount,
    isLimitReached,
  };
}
