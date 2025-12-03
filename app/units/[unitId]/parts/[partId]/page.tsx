'use client';

import { useEffect, useState, use } from 'react';
import { useSearchParams } from 'next/navigation';
import TrainPage from '@/app/train/page';
import { getUnitById, getPartById, shufflePartSentences } from '@/utils/units';
import type { Sentence } from '@/types/sentence';

export default function PartPracticePage({
  params,
}: {
  params: Promise<{ unitId: string; partId: string }>;
}) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const shuffleMode = searchParams.get('shuffle') === 'true';

  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unit, setUnit] = useState<any>(null);
  const [part, setPart] = useState<any>(null);

  useEffect(() => {
    const loadedUnit = getUnitById(resolvedParams.unitId);
    const loadedPart = loadedUnit
      ? getPartById(resolvedParams.unitId, resolvedParams.partId)
      : undefined;

    setUnit(loadedUnit);
    setPart(loadedPart);

    if (loadedPart) {
      const sentencesToUse = shuffleMode
        ? shufflePartSentences(loadedPart).sentences
        : loadedPart.sentences;
      setSentences(sentencesToUse);
    }

    setIsLoading(false);
  }, [resolvedParams.unitId, resolvedParams.partId, shuffleMode]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
          <p className="text-lg font-semibold text-gray-700">読み込み中です...</p>
        </div>
      </div>
    );
  }

  if (!unit || !part) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
          <h1 className="text-2xl font-black text-gray-800 mb-4">
            Part が見つかりません
          </h1>
          <a
            href="/units"
            className="text-blue-500 hover:text-blue-700 font-semibold"
          >
            ← Unit一覧に戻る
          </a>
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
      pageTitle={`${part.title} - Part ${part.partNumber}`}
      backLink={`/units/${unit.id}?shuffle=${shuffleMode}`}
    />
  );
}
