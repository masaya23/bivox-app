'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ShadowingTrainer from '@/components/train/ShadowingTrainer';
import SpeakingTrainer from '@/components/train/SpeakingTrainer';
import AIDrillTrainer from '@/components/train/AIDrillTrainer';
import { getUnitsByFilter, selectSentencesFromMultipleUnits } from '@/utils/units';
import type { TabFilter } from '@/types/unit';
import type { Sentence } from '@/types/sentence';

const FILTER_NAMES: Record<TabFilter, string> = {
  all: '全学年',
  'junior-high-1': '中学1年',
  'junior-high-2': '中学2年',
  'junior-high-3': '中学3年',
};

function AllUnitsPracticePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const filter = (searchParams.get('filter') || 'all') as TabFilter;
  const questionCount = parseInt(searchParams.get('count') || '0', 10);
  const seedParam = searchParams.get('seed');
  const seed = seedParam ? Number(seedParam) : 0;
  const shuffleMode = true;
  const mode = searchParams.get('mode') || 'shadowing';

  if (!questionCount) {
    router.push(`/units/practice/select?filter=${filter}&shuffle=${shuffleMode}`);
    return null;
  }

  const units = getUnitsByFilter(filter);
  const selectedSentences: Sentence[] = selectSentencesFromMultipleUnits(
    units,
    questionCount,
    shuffleMode,
    Number.isFinite(seed) ? seed : 0
  );

  if (selectedSentences.length === 0) {
    router.push(`/units/practice/select?filter=${filter}&shuffle=${shuffleMode}`);
    return null;
  }

  const modeSelectLink = `/units/practice/mode?filter=${filter}&count=${questionCount}&shuffle=${shuffleMode}&seed=${Number.isFinite(seed) ? seed : 0}`;
  const partSelectLink = `/units?grade=${filter}`;
  const drillTitle = `${FILTER_NAMES[filter]} まとめて練習`;

  const grammarTags = Array.from(
    new Set(selectedSentences.flatMap(sentence => sentence.tags || []))
  );

  if (mode === 'speaking') {
    return (
      <SpeakingTrainer
        initialSentences={selectedSentences}
        pageTitle="Unit練習"
        backLink={partSelectLink}
        gradeId={filter}
        partLabel="まとめ"
      />
    );
  }

  if (mode === 'ai-drill') {
    return (
      <AIDrillTrainer
        partSentences={selectedSentences}
        partId={`bundle-${filter}`}
        partTitle={drillTitle}
        grammarTags={grammarTags}
        backLink={modeSelectLink}
        partSelectLink={partSelectLink}
        gradeId={filter}
        partLabel="まとめ"
      />
    );
  }

  return (
    <ShadowingTrainer
      initialSentences={selectedSentences}
      pageTitle="Unit練習"
      backLink={partSelectLink}
      gradeId={filter}
      partLabel="まとめ"
    />
  );
}

export default function AllUnitsPracticePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    }>
      <AllUnitsPracticePageContent />
    </Suspense>
  );
}
