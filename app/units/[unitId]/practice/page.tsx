'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useAppRouter } from '@/hooks/useAppRouter';
import ShadowingTrainer from '@/components/train/ShadowingTrainer';
import SpeakingTrainer from '@/components/train/SpeakingTrainer';
import AIDrillTrainer from '@/components/train/AIDrillTrainer';
import { getUnitById, selectSentencesWithPriority } from '@/utils/units';
import type { Sentence } from '@/types/sentence';

function UnitPracticePageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useAppRouter();

  const unitId = params.unitId as string;
  const questionCount = parseInt(searchParams.get('count') || '0', 10);
  const seedParam = searchParams.get('seed');
  const seed = seedParam ? Number(seedParam) : 0;
  const shuffleMode = true;
  const mode = searchParams.get('mode') || 'shadowing';

  const unit = getUnitById(unitId);
  if (!unit) {
    router.push('/units');
    return null;
  }

  if (!questionCount) {
    router.push(`/units/${unit.id}/practice/select?shuffle=${shuffleMode}`);
    return null;
  }

  const selectedSentences: Sentence[] = selectSentencesWithPriority(
    unit,
    questionCount,
    shuffleMode,
    Number.isFinite(seed) ? seed : 0
  );

  if (selectedSentences.length === 0) {
    router.push(`/units/${unit.id}/practice/select?shuffle=${shuffleMode}`);
    return null;
  }

  const modeSelectLink = `/units/${unit.id}/practice/mode?count=${questionCount}&shuffle=${shuffleMode}&seed=${Number.isFinite(seed) ? seed : 0}`;
  const partSelectLink = `/units?grade=${unit.grade}`;
  const drillTitle = `${unit.title} まとめて練習`;

  const grammarTags = Array.from(
    new Set(selectedSentences.flatMap(sentence => sentence.tags || []))
  );

  if (mode === 'speaking') {
    return (
      <SpeakingTrainer
        initialSentences={selectedSentences}
        pageTitle={`${unit.title} - まとめて練習`}
        backLink={`/units/${unit.id}/practice/select?shuffle=${shuffleMode}`}
        gradeId={unit.grade}
        partLabel="まとめ"
      />
    );
  }

  if (mode === 'ai-drill') {
    return (
      <AIDrillTrainer
        partSentences={selectedSentences}
        partId={`bundle-${unit.id}`}
        partTitle={drillTitle}
        grammarTags={grammarTags}
        backLink={modeSelectLink}
        partSelectLink={partSelectLink}
        gradeId={unit.grade}
        partLabel="まとめ"
      />
    );
  }

  return (
    <ShadowingTrainer
      initialSentences={selectedSentences}
      pageTitle={`${unit.title} - まとめて練習`}
      backLink={`/units/${unit.id}/practice/select?shuffle=${shuffleMode}`}
      gradeId={unit.grade}
      partLabel="まとめ"
    />
  );
}

export default function UnitPracticePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    }>
      <UnitPracticePageContent />
    </Suspense>
  );
}
