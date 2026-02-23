'use client';

/* eslint-disable @next/next/no-html-link-for-pages */

import { Suspense, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getUnitById } from '@/utils/units';

const QUESTION_COUNTS = [10, 25, 50, 75, 100];

function UnitPracticeSelectPageContent() {
  const params = useParams();
  const unitId = params.unitId as string;
  const shuffleMode = true;
  const [seed, setSeed] = useState<string | null>(null);

  useEffect(() => {
    if (seed !== null) return;
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    setSeed(String(buffer[0]));
  }, [seed]);

  const unit = getUnitById(unitId);

  if (!unit) {
    return (
      <div className="min-h-screen bg-gray-200 flex justify-center">
        <div className="w-full max-w-[430px] bg-gray-50 min-h-screen shadow-xl flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 text-center w-full">
            <h1 className="text-2xl font-black text-gray-800 mb-4">
              Unitが見つかりません
            </h1>
            <a href="/units" className="text-blue-500 hover:text-blue-700 font-semibold">
              &larr; Unit一覧に戻る
            </a>
          </div>
        </div>
      </div>
    );
  }

  const totalSentences = unit.parts.reduce((total, part) => total + part.sentences.length, 0);

  const hrefForCount = (count: number) =>
    `/units/${unit.id}/practice/mode?count=${count}&shuffle=${shuffleMode}&seed=${seed ?? '0'}`;

  const allButtonGradient =
    unit.grade === 'junior-high-1'
      ? 'from-[#1E90FF] to-[#1E90FF]'
      : unit.grade === 'junior-high-2'
        ? 'from-[#2ECC71] to-[#2ECC71]'
        : 'from-[#FF4757] to-[#FF4757]';

  const allButtonHover =
    unit.grade === 'junior-high-1'
      ? 'hover:from-[#1A7FE5] hover:to-[#1A7FE5]'
      : unit.grade === 'junior-high-2'
        ? 'hover:from-[#27AE60] hover:to-[#27AE60]'
        : 'hover:from-[#E5404F] hover:to-[#E5404F]';

  return (
    <div className="min-h-screen bg-gray-200 flex justify-center">
      <div className="w-full max-w-[430px] bg-gray-50 min-h-screen shadow-xl">
        <div className="px-4 py-4">
          {/* ヘッダー */}
          <div className="bg-white rounded-3xl shadow-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <a
                href={`/units?grade=${unit.grade}`}
                className="text-gray-600 hover:text-gray-800 font-semibold"
              >
                &larr; Part選択
              </a>
            </div>

            <div className="text-center">
              <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">
                まとめて練習 (シャッフル)
              </span>
              <h1 className="text-2xl font-black text-gray-800 mt-2">
                問題数を選択
              </h1>
            </div>
          </div>

          {/* 問題数選択カード */}
          <div className="space-y-4">
            {QUESTION_COUNTS.map((count) => (
              <a
                key={count}
                href={hrefForCount(count)}
                className={`block w-full p-6 rounded-2xl shadow-lg transition-all ${
                  count > totalSentences
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed pointer-events-none'
                    : 'bg-white hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 hover:shadow-xl'
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
                      <p className="text-sm text-gray-400">
                        問題数が不足しています
                      </p>
                    )}
                  </div>
                  {count <= totalSentences && (
                    <div className="text-4xl">&rarr;</div>
                  )}
                </div>
              </a>
            ))}

            {/* すべての問題を練習 */}
            <a
              href={hrefForCount(totalSentences)}
              className={`block w-full p-6 rounded-2xl shadow-lg bg-gradient-to-r ${allButtonGradient} text-white ${allButtonHover} transition-all`}
            >
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <h2 className="text-2xl font-black">
                    すべて ({totalSentences}問)
                  </h2>
                  <p className="text-sm text-white/80">
                    全パートのすべての問題を練習
                  </p>
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

export default function UnitPracticeSelectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-200 flex justify-center">
        <div className="w-full max-w-[430px] bg-gray-50 min-h-screen shadow-xl flex items-center justify-center">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </div>
    }>
      <UnitPracticeSelectPageContent />
    </Suspense>
  );
}
