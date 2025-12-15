import { redirect } from 'next/navigation';
import ShadowingTrainer from '@/components/train/ShadowingTrainer';
import SpeakingTrainer from '@/components/train/SpeakingTrainer';
import { getUnitById, selectSentencesWithPriority } from '@/utils/units';
import type { Sentence } from '@/types/sentence';

export const dynamic = 'force-dynamic';

export default async function UnitPracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ unitId: string }>;
  searchParams: Promise<{ count?: string; shuffle?: string; mode?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const questionCount = parseInt(resolvedSearchParams.count || '0', 10);
  const shuffleMode =
    resolvedSearchParams.shuffle === 'false'
      ? false
      : resolvedSearchParams.shuffle === 'true'
        ? true
        : true;
  const mode = resolvedSearchParams.mode || 'shadowing';

  const unit = getUnitById(resolvedParams.unitId);
  if (!unit) {
    redirect('/units');
  }

  if (!questionCount) {
    redirect(`/units/${unit.id}/practice/select?shuffle=${shuffleMode}`);
  }

  const selectedSentences: Sentence[] = selectSentencesWithPriority(
    unit,
    questionCount,
    shuffleMode
  );

  if (selectedSentences.length === 0) {
    redirect(`/units/${unit.id}/practice/select?shuffle=${shuffleMode}`);
  }

  if (mode === 'speaking') {
    return (
      <SpeakingTrainer
        initialSentences={selectedSentences}
        pageTitle={`${unit.title} - まとめて練習`}
        backLink={`/units/${unit.id}?shuffle=${shuffleMode}`}
      />
    );
  }

  return (
    <ShadowingTrainer
      initialSentences={selectedSentences}
      pageTitle={`${unit.title} - まとめて練習`}
      backLink={`/units/${unit.id}?shuffle=${shuffleMode}`}
    />
  );
}
