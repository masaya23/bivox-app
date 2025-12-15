/* eslint-disable @next/next/no-html-link-for-pages */

import { getUnitById, getGradeName } from '@/utils/units';

export default async function UnitDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ unitId: string }>;
  searchParams: Promise<{ shuffle?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const shuffleMode = resolvedSearchParams.shuffle === 'true';

  const unit = getUnitById(resolvedParams.unitId);

  if (!unit) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 p-4 flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
          <h1 className="text-2xl font-black text-gray-800 mb-4">
            Unitが見つかりません
          </h1>
          <a href="/units" className="text-blue-500 hover:text-blue-700 font-semibold">
            ← Unit一覧に戻る
          </a>
        </div>
      </div>
    );
  }

  const toggleShuffleHref = `/units/${unit.id}?shuffle=${shuffleMode ? 'false' : 'true'}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 p-4">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <a href="/units" className="text-gray-600 hover:text-gray-800 font-semibold">
              ← Unit一覧
            </a>
            <div className="text-center flex-1">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                {getGradeName(unit.grade)}
              </span>
              <h1 className="text-3xl font-black text-gray-800 mt-2">
                {unit.title}
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                {unit.description}
              </p>
            </div>
            <div className="w-20"></div>
          </div>

          {/* シャッフルモード切り替え（パート練習で使用） */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <span className="text-gray-700 font-semibold">Part練習をシャッフルする</span>
            <a
              href={toggleShuffleHref}
              className={`relative w-14 h-8 rounded-full transition-colors ${shuffleMode ? 'bg-green-500' : 'bg-gray-300'}`}
              aria-label="Part練習のシャッフル切り替え"
            >
              <div
                className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${shuffleMode ? 'transform translate-x-6' : ''}`}
              />
            </a>
          </div>
        </div>

        {/* Unit内まとめて練習ボタン */}
        {unit.parts.length > 1 && (
          <div className="mb-6">
            <a
              href={`/units/${unit.id}/practice/select?shuffle=${shuffleMode}`}
              className="block bg-gradient-to-r from-orange-500 to-red-500 text-white text-center py-4 rounded-2xl font-bold text-lg shadow-lg hover:from-orange-600 hover:to-red-600 transition-all transform hover:scale-105"
            >
              {unit.title}をまとめて練習
              {shuffleMode ? ' (シャッフル)' : ' (順番通り)'}
            </a>
          </div>
        )}

        {/* Partリスト */}
        <div className="space-y-4">
          {unit.parts.map((part) => (
            <a
              key={part.id}
              href={`/units/${unit.id}/parts/${part.id}/mode?shuffle=${shuffleMode}`}
              className="block bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all transform hover:scale-105"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                      Part {part.partNumber}
                    </span>
                    <span className="text-gray-500 text-sm">
                      {part.sentences.length}問
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-800 mb-1">
                    {part.title}
                  </h2>
                  <p className="text-gray-600 text-sm">
                    {part.description}
                  </p>
                </div>
                <div className="text-4xl ml-4">→</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
