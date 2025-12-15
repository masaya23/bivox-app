'use client';

import { useEffect, useState } from 'react';
import HardNavLink from '@/components/HardNavLink';
import { getStreakData } from '@/utils/streak';

export default function Home() {
  const [streakData, setStreakData] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    // Streakデータと統計を読み込み
    setStreakData(getStreakData());

    const statsStr = localStorage.getItem('trainingStats');
    if (statsStr) {
      setStats(JSON.parse(statsStr));
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl p-8 md:p-12">
        <div className="text-center mb-8">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 blur-2xl opacity-30 animate-pulse"></div>
            <h1 className="relative text-5xl md:text-7xl font-black mb-2">
              <span className="bg-gradient-to-r from-green-500 via-blue-600 to-purple-600 bg-clip-text text-transparent drop-shadow-lg">
                瞬間英会話
              </span>
              <br />
              <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 bg-clip-text text-transparent drop-shadow-lg">
                トレーニング
              </span>
            </h1>
          </div>
          <p className="text-xl md:text-2xl font-semibold text-gray-700">
            <span className="inline-block mr-2">💬</span>
            短い文でスピーキング力アップ
            <span className="inline-block ml-2">🚀</span>
          </p>
        </div>

        {/* Streakカード */}
        {streakData && streakData.currentStreak > 0 && (
          <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">
              🔥 連続学習記録
            </h3>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-4xl font-black text-orange-600">
                  {streakData.currentStreak}
                </p>
                <p className="text-sm text-gray-600">連続日数</p>
              </div>
              <div>
                <p className="text-4xl font-black text-red-600">
                  {streakData.longestStreak}
                </p>
                <p className="text-sm text-gray-600">最長記録</p>
              </div>
            </div>
          </div>
        )}

        {/* 統計カード */}
        {stats && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">
              📊 学習統計
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-black text-blue-600">
                  {stats.totalSessions}
                </p>
                <p className="text-xs text-gray-600">セッション</p>
              </div>
              <div>
                <p className="text-2xl font-black text-purple-600">
                  {stats.totalQuestions}
                </p>
                <p className="text-xs text-gray-600">総問題数</p>
              </div>
              <div>
                <p className="text-2xl font-black text-green-600">
                  {stats.averageAccuracy}%
                </p>
                <p className="text-xs text-gray-600">平均正解率</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-4 p-4 bg-green-50 rounded-xl border-2 border-green-200">
            <div className="text-3xl">✨</div>
            <div>
              <h3 className="font-bold text-gray-800">AI生成で無限に学習</h3>
              <p className="text-sm text-gray-600">
                毎回新しい例文で飽きずに継続
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
            <div className="text-3xl">🎯</div>
            <div>
              <h3 className="font-bold text-gray-800">
                間隔反復で効率的に記憶
              </h3>
              <p className="text-sm text-gray-600">
                苦手な例文は自動的に多く出題
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-xl border-2 border-purple-200">
            <div className="text-3xl">🔊</div>
            <div>
              <h3 className="font-bold text-gray-800">音声読み上げ対応</h3>
              <p className="text-sm text-gray-600">
                ネイティブ発音で耳も鍛える
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <HardNavLink
              href="/units"
              className="block w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xl font-bold rounded-2xl text-center hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 shadow-lg"
            >
              📚 Unit学習
            </HardNavLink>
            <HardNavLink
              href="/conversation"
              className="block w-full py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white text-xl font-bold rounded-2xl text-center hover:from-green-600 hover:to-blue-600 transition-all transform hover:scale-105 shadow-lg"
            >
              🗣️ AIと英会話
            </HardNavLink>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <HardNavLink
              href="/train"
              className="block w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white text-lg font-bold rounded-2xl text-center hover:from-orange-600 hover:to-red-600 transition-all transform hover:scale-105 shadow-md"
            >
              🎯 例文トレーニング
            </HardNavLink>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <HardNavLink
              href="/settings"
              className="block w-full py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl text-center hover:bg-gray-200 transition-colors"
            >
              ⚙️ 設定
            </HardNavLink>
            <HardNavLink
              href="/help"
              className="block w-full py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl text-center hover:bg-gray-200 transition-colors"
            >
              ❓ ヘルプ
            </HardNavLink>
            <HardNavLink
              href="/test-generate"
              className="block w-full py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl text-center hover:bg-gray-200 transition-colors"
            >
              🧪 テスト
            </HardNavLink>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>毎日少しずつ、確実にレベルアップ</p>
        </div>
      </div>
    </div>
  );
}
