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
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z" fill="#22c55e"/><path d="M5 16l1 3 3-1M19 16l-1 3-3-1" strokeWidth="1.5"/></svg>
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
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="#9ca3af"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
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
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 2h14v2H5v-2z"/></svg>
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
