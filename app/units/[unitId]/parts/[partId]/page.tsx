import { redirect } from 'next/navigation';
import ShadowingTrainer from '@/components/train/ShadowingTrainer';
import SpeakingTrainer from '@/components/train/SpeakingTrainer';
import { getUnitById, getPartById, shufflePartSentences } from '@/utils/units';

export const dynamic = 'force-dynamic';

export default async function PartPracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ unitId: string; partId: string }>;
  searchParams: Promise<{ shuffle?: string; mode?: string }>;
}) {
  const { unitId, partId } = await params;
  const sp = await searchParams;
  const shuffleMode = sp.shuffle === 'true';
  const mode = sp.mode || 'shadowing';

  const unit = getUnitById(unitId);
  const part = unit ? getPartById(unitId, partId) : undefined;

  if (!unit || !part) {
    redirect('/units');
  }

  const sentences = shuffleMode ? shufflePartSentences(part).sentences : part.sentences;
  const backLink = `/units/${unit.id}?shuffle=${shuffleMode}`;
  const pageTitle = `${part.title} - Part ${part.partNumber}`;

  if (mode === 'speaking') {
    return (
      <SpeakingTrainer
        initialSentences={sentences}
        pageTitle={pageTitle}
        backLink={backLink}
      />
    );
  }

  return (
    <ShadowingTrainer
      initialSentences={sentences}
      pageTitle={pageTitle}
      backLink={backLink}
    />
  );
}

