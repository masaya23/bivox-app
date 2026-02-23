'use client';

import { useLife } from '@/contexts/LifeContext';
import { LIFE_CONFIG, formatTimeRemaining } from '@/types/life';

function HeartIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

interface LifeIndicatorProps {
  // 表示スタイル: compact = ヘッダー用, full = 詳細表示
  variant?: 'compact' | 'full';
  // タイマーを表示するか（デフォルト: true）
  showTimer?: boolean;
  // クラス名
  className?: string;
}

export default function LifeIndicator({
  variant = 'compact',
  showTimer = true,
  className = '',
}: LifeIndicatorProps) {
  const {
    currentLife,
    secondsToNextRecovery,
    isRecovering,
    isUnlimited,
  } = useLife();

  const compactToneClass = isUnlimited
    ? 'text-[#FF6B6B]'
    : currentLife === 0
    ? 'text-gray-400'
    : 'text-[#FF6B6B]';

  // 無制限の場合
  if (isUnlimited) {
    if (variant === 'compact') {
      return (
        <div className={`flex items-center gap-1 ${className}`}>
          <HeartIcon className={`w-6 h-6 ${compactToneClass}`} />
          <span className={`text-xs font-semibold ${compactToneClass}`}>∞</span>
        </div>
      );
    }

    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <HeartIcon className={`w-6 h-6 ${compactToneClass}`} />
        <span className={`text-lg font-bold ${compactToneClass}`}>無制限</span>
      </div>
    );
  }

  // ライフの割合（0-1）
  const lifeRatio = currentLife / LIFE_CONFIG.MAX_LIFE;

  // ライフが少ない場合の警告色
  const getLifeColor = () => {
    if (currentLife === 0) return 'text-gray-400';
    if (lifeRatio <= 0.2) return 'text-red-500';
    if (lifeRatio <= 0.5) return 'text-orange-500';
    return 'text-red-500';
  };

  // コンパクト表示（ヘッダー用）
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <HeartIcon className={`w-6 h-6 ${compactToneClass}`} />
        <span className={`text-sm font-semibold ${compactToneClass}`}>
          {currentLife}/{LIFE_CONFIG.MAX_LIFE}
        </span>
        {showTimer && isRecovering && (
          <span className="text-xs text-gray-500 ml-1">
            ({formatTimeRemaining(secondsToNextRecovery)})
          </span>
        )}
      </div>
    );
  }

  // フル表示（詳細）
  return (
    <div className={`${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <HeartIcon className={`w-6 h-6 ${compactToneClass}`} />
        <span className={`text-lg font-bold ${getLifeColor()}`}>
          {currentLife} / {LIFE_CONFIG.MAX_LIFE}
        </span>
      </div>

      {/* プログレスバー */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${
            lifeRatio <= 0.2
              ? 'bg-red-500'
              : lifeRatio <= 0.5
              ? 'bg-orange-500'
              : 'bg-red-400'
          }`}
          style={{ width: `${lifeRatio * 100}%` }}
        />
      </div>

      {/* 回復カウントダウン */}
      {showTimer && isRecovering && (
        <p className="text-xs text-gray-500">
          次の回復まで: {formatTimeRemaining(secondsToNextRecovery)}
        </p>
      )}
    </div>
  );
}
