'use client';

import { useLife } from '@/contexts/LifeContext';
import { LIFE_CONFIG, formatTimeRemaining, getTimeToFullRecovery } from '@/types/life';
import RewardVideoAd from '@/components/ads/RewardVideoAd';
import HardNavLink from '@/components/HardNavLink';

export default function LifeOutDialog() {
  const {
    showLifeOutDialog,
    closeLifeOutDialog,
    currentLife,
    secondsToNextRecovery,
    refillLife,
    isUnlimited,
  } = useLife();

  // 無制限の場合またはダイアログを表示しない場合は何も表示しない
  if (isUnlimited || !showLifeOutDialog) {
    return null;
  }

  // 次の1回復までの時間
  const timeToNextLife = formatTimeRemaining(secondsToNextRecovery);

  // フル回復までの時間
  const timeToFull = formatTimeRemaining(
    getTimeToFullRecovery(currentLife, secondsToNextRecovery)
  );

  // リワード広告視聴完了 → ライフ+5回復してダイアログを閉じる
  const handleRewardEarned = () => {
    refillLife(5);
  };

  const handleAdClosed = () => {
    closeLifeOutDialog();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
        {/* ヘッダー */}
        <div className="text-center mb-6">
          <div className="mb-3 flex justify-center"><svg width="48" height="48" viewBox="0 0 24 24" fill="#ef4444"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/><line x1="4" y1="4" x2="20" y2="20" stroke="white" strokeWidth="2.5"/></svg></div>
          <h2 className="text-xl font-black text-gray-900">ライフがありません</h2>
          <p className="text-sm text-gray-600 mt-2">
            ライフが回復するまで待つか、<br />
            広告を見て回復できます
          </p>
        </div>

        {/* ライフ状態 */}
        <div className="bg-gray-100 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">現在のライフ</span>
            <span className="text-lg font-bold text-red-500">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="inline-block align-middle mr-1"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg> {currentLife} / {LIFE_CONFIG.MAX_LIFE}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">次の回復まで</span>
            <span className="text-lg font-bold text-blue-600">{timeToNextLife}</span>
          </div>
          {currentLife === 0 && (
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-gray-600">フル回復まで</span>
              <span className="text-sm font-bold text-gray-500">{timeToFull}</span>
            </div>
          )}
        </div>

        {/* アクションボタン */}
        <div className="space-y-3">
          {/* リワード動画広告を見てライフ回復 */}
          <RewardVideoAd
            onRewardEarned={handleRewardEarned}
            onAdClosed={handleAdClosed}
            triggerText="広告を見て +5 ライフ回復"
          />

          {/* プレミアムプランへ */}
          <HardNavLink href="/settings" onClick={closeLifeOutDialog}>
            <button className="w-full py-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 2h14v2H5v-2z"/></svg>
              <span>プレミアムでライフ無制限</span>
            </button>
          </HardNavLink>

          {/* 回復を待つ */}
          <button
            onClick={closeLifeOutDialog}
            className="w-full py-3 bg-gray-200 text-gray-700 font-bold rounded-xl active:scale-[0.98] transition-transform"
          >
            回復を待つ（{timeToNextLife}後）
          </button>
        </div>
      </div>
    </div>
  );
}
