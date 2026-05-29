'use client';

import SpeakingTrainer from '@/components/train/SpeakingTrainer';
import ModeAccessGate from '@/components/subscription/ModeAccessGate';

export default function SpeakingPage() {
  return (
    <ModeAccessGate mode="speaking" backLink="/train">
      <SpeakingTrainer backLink="/train" />
    </ModeAccessGate>
  );
}
