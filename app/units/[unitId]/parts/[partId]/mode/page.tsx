
/* eslint-disable @next/next/no-html-link-for-pages */

import { getUnitById, getPartById } from '@/utils/units';

export default async function PartPracticeModeSelectPage({
  params,
  searchParams,
}: {
  params: Promise<{ unitId: string; partId: string }>;
  searchParams: Promise<{ shuffle?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const shuffleMode = resolvedSearchParams.shuffle === 'true';

  const unit = getUnitById(resolvedParams.unitId);
  const part = unit ? getPartById(resolvedParams.unitId, resolvedParams.partId) : undefined;

  if (!unit || !part) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 p-4 flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
          <h1 className="text-2xl font-black text-gray-800 mb-4">
            Partが見つかりません
          </h1>
          <a href="/units" className="text-blue-500 hover:text-blue-700 font-semibold">
            ← Unit一覧に戻る
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl p-8 md:p-12">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-black text-gray-800 mb-4">
            トレーニングモード選択
          </h1>
          <p className="text-lg text-gray-600">
            {unit.title} - {part.title}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {part.sentences.length}問
          </p>
        </div>

        {/* モード選択カード */}
        <div className="space-y-4 mb-8">
          {/* シャドーイングモード */}
          <a
            href={`/units/${unit.id}/parts/${part.id}?shuffle=${shuffleMode}&mode=shadowing`}
            className="block p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl border-2 border-green-200 hover:border-green-400 transition-all transform hover:scale-105"
          >
            <div className="flex items-start gap-4">
              <div className="text-2xl font-black text-green-700">SH</div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  シャドーイングモード
                </h2>
                <p className="text-gray-600 mb-3">
                  音声を聞いて真似する基本トレーニング
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-green-600">✓</span>
                    <span>日本語音声 → 一時停止 → 英語音声</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-green-600">✓</span>
                    <span>自分のペースで練習できる</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-green-600">✓</span>
                    <span>初心者におすすめ</span>
                  </div>
                </div>
              </div>
              <div className="text-gray-400 text-3xl">→</div>
            </div>
          </a>

          {/* スピーキングモード */}
          <a
            href={`/units/${unit.id}/parts/${part.id}?shuffle=${shuffleMode}&mode=speaking`}
            className="block p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border-2 border-purple-200 hover:border-purple-400 transition-all transform hover:scale-105"
          >
            <div className="flex items-start gap-4">
              <div className="text-2xl font-black text-purple-700">SP</div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  スピーキングモード
                </h2>
                <p className="text-gray-600 mb-3">
                  音声入力で自動判定する実践トレーニング
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-purple-600">✓</span>
                    <span>日本語音声 → 音声入力 → 自動判定</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-purple-600">✓</span>
                    <span>発音の正確さをチェック</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-purple-600">✓</span>
                    <span>中級者以上におすすめ</span>
                  </div>
                </div>
              </div>
              <div className="text-gray-400 text-3xl">→</div>
            </div>
          </a>
        </div>

        {/* 戻るボタン */}
        <a
          href={`/units/${unit.id}?shuffle=${shuffleMode}`}
          className="block w-full py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl text-center hover:bg-gray-200 transition-colors"
        >
          ← {unit.title}に戻る
        </a>
      </div>
    </div>
  );
}
