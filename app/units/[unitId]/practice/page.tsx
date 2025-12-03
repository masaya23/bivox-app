'use client';

import { useEffect, useState, use } from 'react';
import { useSearchParams } from 'next/navigation';
import TrainPage from '@/app/train/page';
import { getUnitById, selectSentencesWithPriority } from '@/utils/units';
import type { Sentence } from '@/types/sentence';

export default function UnitPracticePage({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const shuffleMode = searchParams.get('shuffle') === 'true';
  const questionCount = parseInt(searchParams.get('count') || '0', 10);

  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unit, setUnit] = useState<any>(null);

  useEffect(() => {
    const loadedUnit = getUnitById(resolvedParams.unitId);
    setUnit(loadedUnit);

    if (!loadedUnit) {
      setIsLoading(false);
      return;
    }

    // 問題数が指定されていない場合はセレクト画面へ戻す
    if (questionCount === 0) {
      window.location.href = `/units/${loadedUnit.id}/practice/select?shuffle=${shuffleMode}`;
      return;
    }

    // 優先度重み付けで例文を選択
    const selectedSentences = selectSentencesWithPriority(
      loadedUnit,
      questionCount,
      shuffleMode
    );
    setSentences(selectedSentences);
    setIsLoading(false);
  }, [resolvedParams.unitId, shuffleMode, questionCount]);

  if (isLoading || !unit) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
          <p className="text-lg font-semibold text-gray-700">
            {!unit ? 'Unitが見つかりません' : '読み込み中です...'}
          </p>
          {!unit && (
            <a
              href="/units"
              className="text-blue-500 hover:text-blue-700 font-semibold mt-4 inline-block"
            >
              ← Unit一覧に戻る
            </a>
          )}
        </div>
      </div>
    );
  }

  if (sentences.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
          <p className="text-lg font-semibold text-gray-700">読み込み中です...</p>
        </div>
      </div>
    );
  }

  return (
    <TrainPage
      initialSentences={sentences}
      pageTitle={`${unit.title} - まとめて練習`}
      backLink={`/units/${unit.id}?shuffle=${shuffleMode}`}
    />
  );
}
