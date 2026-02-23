'use client';

/* eslint-disable @next/next/no-html-link-for-pages */

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getUnitsByFilter } from '@/utils/units';
import { TabFilter } from '@/types/unit';

const QUESTION_COUNTS = [10, 25, 50, 75, 100];

function AllUnitsPracticeSelectPageContent() {
  const searchParams = useSearchParams();

  const filter = (searchParams.get('filter') || 'all') as TabFilter;
  const shuffleMode = true;
  const [seed, setSeed] = useState<string | null>(null);

  useEffect(() => {
    if (seed !== null) return;
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    setSeed(String(buffer[0]));
  }, [seed]);

  const units = getUnitsByFilter(filter);
  const totalSentences = units.reduce(
    (total, unit) =>
      total + unit.parts.reduce((sum, part) => sum + part.sentences.length, 0),
    0
  );

  const getFilterName = (f: TabFilter): string => {
    const names: Record<TabFilter, string> = {
      all: '全学年',
      'junior-high-1': '中学1年',
      'junior-high-2': '中学2年',
      'junior-high-3': '中学3年',
    };
    return names[f];
  };

  const handleSelectHref = (count: number) =>
    `/units/practice/mode?filter=${filter}&count=${count}&shuffle=${shuffleMode}&seed=${seed ?? '0'}`;

  return (
    <div className="min-h-screen bg-gray-200 flex justify-center">
      <div className="w-full max-w-[430px] bg-gray-50 min-h-screen shadow-xl">
        <div className="px-4 py-4">
          {/* ヘッダー */}
          <div className="bg-white rounded-3xl shadow-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
            <a
              href={`/units?grade=${filter}`}
              className="text-gray-600 hover:text-gray-800 font-semibold"
            >
              &larr; Part選択
            </a>
            </div>

            <div className="text-center">
            <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">
              まとめて練習 (シャッフル)
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
              <a
                key={count}
                href={handleSelectHref(count)}
                className={`block w-full p-6 rounded-2xl shadow-lg transition-all ${
                  count > totalSentences
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed pointer-events-none'
                    : 'bg-white hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 hover:shadow-xl'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <h2
                      className={`text-2xl font-black ${
                        count > totalSentences ? 'text-gray-400' : 'text-gray-800'
                      }`}
                    >
                      {count}問
                    </h2>
                    {count > totalSentences && (
                      <p className="text-sm text-gray-400">問題数が不足しています</p>
                    )}
                  </div>
                  {count <= totalSentences && <div className="text-4xl">&rarr;</div>}
                </div>
              </a>
            ))}

            {/* すべての問題を練習 */}
            <a
              href={handleSelectHref(totalSentences)}
              className="block w-full p-6 rounded-2xl shadow-lg bg-[#3949AB] text-white hover:bg-[#303F9F] transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <h2 className="text-2xl font-black">すべて ({totalSentences}問)</h2>
                  <p className="text-sm text-white/80">全ユニットのすべての問題を練習</p>
                </div>
                <div className="text-4xl">&rarr;</div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AllUnitsPracticeSelectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-200 flex justify-center">
        <div className="w-full max-w-[430px] bg-gray-50 min-h-screen shadow-xl flex items-center justify-center">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </div>
    }>
      <AllUnitsPracticeSelectPageContent />
    </Suspense>
  );
}
