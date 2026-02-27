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
          <div className="text-5xl mb-3">💔</div>
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
              ❤️ {currentLife} / {LIFE_CONFIG.MAX_LIFE}
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
              <span className="text-xl">👑</span>
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
