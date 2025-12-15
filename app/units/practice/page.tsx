import { redirect } from 'next/navigation';
import ShadowingTrainer from '@/components/train/ShadowingTrainer';
import SpeakingTrainer from '@/components/train/SpeakingTrainer';
import { getUnitsByFilter, selectSentencesFromMultipleUnits } from '@/utils/units';
import type { TabFilter } from '@/types/unit';

export const dynamic = 'force-dynamic';

export default async function AllUnitsPracticePage({
  searchParams,
}: {
  searchParams: Promise<{
    filter?: string;
    count?: string;
    shuffle?: string;
    mode?: string;
  }>;
}) {
  const resolvedSearchParams = await searchParams;
  const filter = (resolvedSearchParams.filter || 'all') as TabFilter;
  const questionCount = parseInt(resolvedSearchParams.count || '0', 10);
  const shuffleMode =
    resolvedSearchParams.shuffle === 'false'
      ? false
      : resolvedSearchParams.shuffle === 'true'
        ? true
        : true;
  const mode = resolvedSearchParams.mode || 'shadowing';

  if (!questionCount) {
    redirect(`/units/practice/select?filter=${filter}&shuffle=${shuffleMode}`);
  }

  const units = getUnitsByFilter(filter);
  const selectedSentences = selectSentencesFromMultipleUnits(
    units,
    questionCount,
    shuffleMode
  );

  if (selectedSentences.length === 0) {
    redirect(`/units/practice/select?filter=${filter}&shuffle=${shuffleMode}`);
  }

  if (mode === 'speaking') {
    return (
      <SpeakingTrainer
        initialSentences={selectedSentences}
        pageTitle="Unit練習"
        backLink="/units"
      />
    );
  }

  return (
    <ShadowingTrainer
      initialSentences={selectedSentences}
      pageTitle="Unit練習"
      backLink="/units"
    />
  );
}
