'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import ShadowingTrainer from '@/components/train/ShadowingTrainer';
import SpeakingTrainer from '@/components/train/SpeakingTrainer';
import AIDrillTrainer from '@/components/train/AIDrillTrainer';
import { getUnitById, getPartById, getNextPart, shufflePartSentences } from '@/utils/units';

// unitIdから学年を判定
function getGradeFromUnitId(unitId: string): string {
  if (unitId === 'unit1') return 'junior-high-1';
  if (unitId === 'unit2') return 'junior-high-2';
  if (unitId === 'unit3') return 'junior-high-3';
  return 'junior-high-1';
}

function PartPracticePageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const unitId = params.unitId as string;
  const partId = params.partId as string;
  const shuffleMode = searchParams.get('shuffle') === 'true';
  const mode = searchParams.get('mode') || 'shadowing';
  const gradeParam = searchParams.get('grade');

  const unit = getUnitById(unitId);
  const part = unit ? getPartById(unitId, partId) : undefined;

  if (!unit || !part) {
    router.push('/units');
    return null;
  }

  const sentences = shuffleMode ? shufflePartSentences(part).sentences : part.sentences;
  // 戻り先はモード選択画面
  const grade = gradeParam || getGradeFromUnitId(unitId);
  const backLink = `/units/${unitId}/parts/${partId}/mode?shuffle=${shuffleMode}&grade=${grade}`;
  const partSelectLink = `/units?grade=${grade}`;
  const pageTitle = `${part.title} - Part ${part.partNumber}`;
  const partLabel = `Part${part.partNumber}`;

  // 次のPartへのリンクを生成
  const nextPart = getNextPart(unitId, partId);
  const nextLessonLink = nextPart
    ? `/units/${unitId}/parts/${nextPart.id}/mode?grade=${grade}`
    : undefined;

  // AI応用ドリルモード
  if (mode === 'ai-drill') {
    // Partのタグ情報を取得（なければ空配列）
    const grammarTags = part.sentences.length > 0 && part.sentences[0].tags
      ? part.sentences[0].tags
      : [];

    return (
      <AIDrillTrainer
        partSentences={part.sentences}
        partId={part.id}
        partTitle={pageTitle}
        grammarTags={grammarTags}
        backLink={backLink}
        partSelectLink={partSelectLink}
        nextLessonLink={nextLessonLink}
        gradeId={grade}
        partLabel={partLabel}
      />
    );
  }

  if (mode === 'speaking') {
    return (
      <SpeakingTrainer
        initialSentences={sentences}
        pageTitle={pageTitle}
        backLink={backLink}
        partSelectLink={partSelectLink}
        nextLessonLink={nextLessonLink}
        partId={part.id}
        partTitle={part.title}
        gradeId={grade}
        partLabel={partLabel}
      />
    );
  }

  return (
    <ShadowingTrainer
      initialSentences={sentences}
      pageTitle={pageTitle}
      backLink={backLink}
      partSelectLink={partSelectLink}
      nextLessonLink={nextLessonLink}
      partId={part.id}
      gradeId={grade}
      partLabel={partLabel}
    />
  );
}

export default function PartPracticePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    }>
      <PartPracticePageContent />
    </Suspense>
  );
}
