'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import TrainPage from '@/app/train/page';
import { getUnitsByFilter, selectSentencesFromMultipleUnits } from '@/utils/units';
import type { TabFilter } from '@/types/unit';
import type { Sentence } from '@/types/sentence';

export default function AllUnitsPracticePage() {
  const searchParams = useSearchParams();
  const filter = (searchParams.get('filter') || 'all') as TabFilter;
  const shuffleMode = searchParams.get('shuffle') === 'true';
  const questionCount = parseInt(searchParams.get('count') || '0', 10);

  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 問題数が指定されていない場合はセレクト画面へ戻す
    if (questionCount === 0) {
      window.location.href = `/units/practice/select?filter=${filter}&shuffle=${shuffleMode}`;
      return;
    }

    const units = getUnitsByFilter(filter);
    const selectedSentences = selectSentencesFromMultipleUnits(
      units,
      questionCount,
      shuffleMode
    );
    setSentences(selectedSentences);
    setIsLoading(false);
  }, [filter, shuffleMode, questionCount]);

  if (isLoading || sentences.length === 0) {
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
      pageTitle="Unit練習"
      backLink="/units"
    />
  );
}
