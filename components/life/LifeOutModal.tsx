'use client';

import { useState } from 'react';
import { useLife } from '@/contexts/LifeContext';
import PaywallScreen from '@/components/subscription/PaywallScreen';
import RewardVideoAd from '@/components/ads/RewardVideoAd';

interface LifeOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLifeRecovered?: () => void;
}

export default function LifeOutModal({
  isOpen,
  onClose,
  onLifeRecovered,
}: LifeOutModalProps) {
  const { refillLife } = useLife();
  const [showPaywall, setShowPaywall] = useState(false);
  const [adWatched, setAdWatched] = useState(false);

  if (!isOpen) return null;

  // リワード広告視聴完了 → ライフ+5回復
  const handleRewardEarned = () => {
    refillLife(5);
    setAdWatched(true);
  };

  // 広告閉じた後にモーダルを閉じる
  const handleAdClosed = () => {
    setTimeout(() => {
      setAdWatched(false);
      onClose();
      onLifeRecovered?.();
    }, 1500);
  };

  // プレミアムにアップグレード
  const handleUpgrade = () => {
    setShowPaywall(true);
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
        onClick={onClose}
      >
        <div
          className="bg-white w-full max-w-[380px] mx-4 rounded-3xl overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 広告視聴完了画面 */}
          {adWatched ? (
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-4xl">🎉</span>
              </div>
              <h3 className="text-xl font-black text-gray-800 mb-2">
                ライフ回復！
              </h3>
              <p className="text-gray-500 text-sm">
                +5 ライフが追加されました
              </p>
            </div>
          ) : (
            <>
              {/* ヘッダー */}
              <div className="bg-gradient-to-r from-red-400 to-pink-400 px-6 py-8 text-center">
                <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-4xl grayscale">❤️</span>
                </div>
                <h2 className="text-2xl font-black text-white mb-2">
                  スタミナがなくなりました
                </h2>
                <p className="text-white/80 text-sm">
                  回復を待つか、以下の方法で続けられます
                </p>
              </div>

              {/* コンテンツ */}
              <div className="p-6">
                {/* オプション1: リワード動画広告を見てライフ回復 */}
                <div className="mb-3">
                  <RewardVideoAd
                    onRewardEarned={handleRewardEarned}
                    onAdClosed={handleAdClosed}
                    triggerText="広告を見て +5 ライフ回復"
                  />
                </div>

                {/* オプション2: プレミアムにアップグレード */}
                <button
                  onClick={handleUpgrade}
                  className="w-full mb-4 p-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl text-white active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-2xl">👑</span>
                    <div className="text-left">
                      <p className="font-bold text-base">プレミアムにアップグレード</p>
                      <p className="text-xs text-white/80">スタミナ無制限で練習し放題</p>
                    </div>
                  </div>
                </button>

                {/* 回復時間の案内 */}
                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⏰</span>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">自然回復を待つ</p>
                      <p className="text-xs text-gray-500">48分ごとに1ライフ回復します</p>
                    </div>
                  </div>
                </div>

                {/* 閉じるボタン */}
                <button
                  onClick={onClose}
                  className="w-full py-3 text-gray-500 font-semibold text-sm"
                >
                  あとで
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ペイウォール */}
      <PaywallScreen
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
      />
    </>
  );
}
