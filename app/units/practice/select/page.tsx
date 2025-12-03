'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { getUnitsByFilter } from '@/utils/units';
import { TabFilter } from '@/types/unit';

const QUESTION_COUNTS = [10, 25, 50, 75, 100];

export default function AllUnitsPracticeSelectPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const filter = (searchParams.get('filter') || 'all') as TabFilter;
  const shuffleMode = searchParams.get('shuffle') === 'true';

  const units = getUnitsByFilter(filter);
  const totalSentences = units.reduce((total, unit) =>
    total + unit.parts.reduce((sum, part) => sum + part.sentences.length, 0), 0
  );

  const getFilterName = (filter: TabFilter): string => {
    const names: Record<TabFilter, string> = {
      'all': '全学年',
      'junior-high-1': '中学1年',
      'junior-high-2': '中学2年',
      'junior-high-3': '中学3年',
    };
    return names[filter];
  };

  const handleSelectCount = (count: number) => {
    router.push(`/units/practice?filter=${filter}&count=${count}&shuffle=${shuffleMode}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 p-4">
      <div className="max-w-2xl mx-auto">
        {/* ヘッダー */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/units"
              className="text-gray-600 hover:text-gray-800 font-semibold"
            >
              ← Unit一覧
            </Link>
          </div>

          <div className="text-center">
            <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">
              まとめて練習
            </span>
            <h1 className="text-2xl font-black text-gray-800 mt-2">
              問題数を選択
            </h1>
            <p className="text-gray-600 text-sm mt-2">
              {getFilterName(filter)}の練習問題数を選んでください
            </p>
          </div>
        </div>

        {/* 問題数選択カード */}
        <div className="space-y-4">
          {QUESTION_COUNTS.map((count) => (
            <button
              key={count}
              onClick={() => handleSelectCount(count)}
              disabled={count > totalSentences}
              className={`w-full p-6 rounded-2xl shadow-lg transition-all ${
                count > totalSentences
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-white hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 hover:shadow-xl'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <h2 className={`text-2xl font-black ${count > totalSentences ? 'text-gray-400' : 'text-gray-800'}`}>
                    {count}問
                  </h2>
                  {count > totalSentences && (
                    <p className="text-sm text-gray-400">
                      問題数が不足しています
                    </p>
                  )}
                </div>
                {count <= totalSentences && (
                  <div className="text-4xl">→</div>
                )}
              </div>
            </button>
          ))}

          {/* すべての問題を練習 */}
          <button
            onClick={() => handleSelectCount(totalSentences)}
            className="w-full p-6 rounded-2xl shadow-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <h2 className="text-2xl font-black">
                  すべて ({totalSentences}問)
                </h2>
                <p className="text-sm text-purple-100">
                  全ユニットのすべての問題を練習
                </p>
              </div>
              <div className="text-4xl">🔥</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
