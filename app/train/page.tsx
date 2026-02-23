'use client';

import HardNavLink from '@/components/HardNavLink';

export default function TrainModePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-[430px] mx-auto relative shadow-xl">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-[#FCC800] to-[#FFD900] px-4 py-4">
        <div className="flex items-center justify-between">
          <HardNavLink href="/" className="text-white/80 hover:text-white font-medium text-sm min-w-[60px]">
            ← ホーム
          </HardNavLink>
          <h1 className="text-xl font-black text-white">
            モード選択
          </h1>
          <div className="min-w-[60px]" />
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 p-4">
        <p className="text-center text-gray-600 mb-4 text-sm">
          あなたに合った学習方法を選んでください
        </p>

        {/* モード選択カード */}
        <div className="space-y-4">
          {/* シャドーイングモード */}
          <HardNavLink
            href="/train/shadowing"
            className="block p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl border-2 border-green-200 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-start gap-3">
              <div className="text-4xl">👂</div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-800 mb-1">
                  シャドーイングモード
                </h2>
                <p className="text-gray-600 text-sm mb-2">
                  音声を聞いて真似する基本トレーニング
                </p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-gray-700">
                    <span className="text-green-600">✓</span>
                    <span>日本語音声 → 一時停止 → 英語音声</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-700">
                    <span className="text-green-600">✓</span>
                    <span>自分のペースで練習できる</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-700">
                    <span className="text-green-600">✓</span>
                    <span>初心者におすすめ</span>
                  </div>
                </div>
              </div>
              <div className="text-gray-400 text-2xl">→</div>
            </div>
          </HardNavLink>

          {/* スピーキングモード */}
          <HardNavLink
            href="/train/speaking"
            className="block p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border-2 border-purple-200 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-start gap-3">
              <div className="text-4xl">🎤</div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-800 mb-1">
                  スピーキングモード
                </h2>
                <p className="text-gray-600 text-sm mb-2">
                  音声入力で自動判定する実践トレーニング
                </p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-gray-700">
                    <span className="text-purple-600">✓</span>
                    <span>日本語音声 → 音声入力 → 自動判定</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-700">
                    <span className="text-purple-600">✓</span>
                    <span>発音の正確さをチェック</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-700">
                    <span className="text-purple-600">✓</span>
                    <span>中級者以上におすすめ</span>
                  </div>
                </div>
              </div>
              <div className="text-gray-400 text-2xl">→</div>
            </div>
          </HardNavLink>
        </div>
      </div>
    </div>
  );
}
