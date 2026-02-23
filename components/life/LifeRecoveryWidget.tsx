'use client';

import { useLife } from '@/contexts/LifeContext';
import { LIFE_CONFIG, formatTimeRemaining, getTimeToFullRecovery } from '@/types/life';

interface LifeRecoveryWidgetProps {
  className?: string;
}

export default function LifeRecoveryWidget({ className = '' }: LifeRecoveryWidgetProps) {
  const {
    currentLife,
    secondsToNextRecovery,
    isRecovering,
    isUnlimited,
  } = useLife();

  // 無制限の場合
  if (isUnlimited) {
    return (
      <div className={`bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl shadow-lg p-5 text-white ${className}`}>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">❤️</span>
          <h3 className="font-bold text-lg">スタミナ</h3>
          <span className="ml-auto px-3 py-1 bg-white/20 rounded-full text-sm font-bold">
            無制限
          </span>
        </div>
        <p className="text-white/80 text-sm">
          プレミアムプランでスタミナ無制限！
        </p>
      </div>
    );
  }

  // ライフの割合（0-1）
  const lifeRatio = currentLife / LIFE_CONFIG.MAX_LIFE;
  const isFull = currentLife >= LIFE_CONFIG.MAX_LIFE;

  // 満タンまでの残り時間
  const timeToFull = getTimeToFullRecovery(currentLife, secondsToNextRecovery);

  // 満タンまでの時間を読みやすい形式に変換
  const formatFullRecoveryTime = (seconds: number): string => {
    if (seconds <= 0) return '満タン';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `約${hours}時間${minutes > 0 ? `${minutes}分` : ''}`;
    }
    return `約${minutes}分`;
  };

  // ライフが少ない場合の警告色
  const getProgressColor = () => {
    if (currentLife === 0) return 'bg-gray-300';
    if (lifeRatio <= 0.2) return 'bg-red-500';
    if (lifeRatio <= 0.5) return 'bg-orange-400';
    return 'bg-gradient-to-r from-red-400 to-pink-400';
  };

  const getBgGradient = () => {
    if (isFull) return 'from-emerald-50 to-teal-50';
    if (lifeRatio <= 0.2) return 'from-red-50 to-orange-50';
    if (lifeRatio <= 0.5) return 'from-amber-50 to-yellow-50';
    return 'from-pink-50 to-red-50';
  };

  const getBorderColor = () => {
    if (isFull) return 'border-emerald-200';
    if (lifeRatio <= 0.2) return 'border-red-200';
    if (lifeRatio <= 0.5) return 'border-orange-200';
    return 'border-pink-200';
  };

  return (
    <div className={`bg-gradient-to-br ${getBgGradient()} rounded-2xl shadow-lg p-5 border ${getBorderColor()} ${className}`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`text-2xl ${currentLife === 0 ? 'grayscale opacity-50' : ''}`}>❤️</span>
          <h3 className="font-bold text-gray-800">スタミナ</h3>
        </div>
        {isFull ? (
          <span className="px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full">
            満タン！
          </span>
        ) : (
          <span className="text-sm text-gray-500">
            {currentLife} / {LIFE_CONFIG.MAX_LIFE}
          </span>
        )}
      </div>

      {/* プログレスバー */}
      <div className="mb-4">
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${getProgressColor()}`}
            style={{ width: `${lifeRatio * 100}%` }}
          />
        </div>
      </div>

      {/* 回復情報 */}
      {isRecovering ? (
        <div className="space-y-2">
          {/* 次の1回復まで */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">次の回復まで</span>
            <span className="font-bold text-gray-800 tabular-nums">
              {formatTimeRemaining(secondsToNextRecovery)}
            </span>
          </div>

          {/* 満タンまで */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">満タンまで</span>
            <span className="font-bold text-gray-800">
              {formatFullRecoveryTime(timeToFull)}
            </span>
          </div>

          {/* 回復予定時刻 */}
          <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-200/50">
            <span className="text-gray-500 text-xs">満タン予定</span>
            <span className="text-gray-600 text-xs">
              {new Date(Date.now() + timeToFull * 1000).toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit',
              })}
              頃
            </span>
          </div>
        </div>
      ) : (
        <div className="text-center py-2">
          <p className="text-emerald-600 font-semibold text-sm">
            スタミナ満タンです！
          </p>
          <p className="text-gray-500 text-xs mt-1">
            たくさん練習しましょう
          </p>
        </div>
      )}
    </div>
  );
}
