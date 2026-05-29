import { useCallback, useEffect, useRef } from 'react';
import { recordLearningTime } from '@/utils/learningTime';
import { recordSession } from '@/utils/sessionLog';
import { updateStreak } from '@/utils/streak';

interface PartialLessonLogOptions {
  mode: string;
  getCompletedQuestions: () => number;
  getElapsedMinutes: () => number;
  isComplete: () => boolean;
  sessionOptions?: { gradeId?: string; partLabel?: string; unit?: 'minutes' | 'questions' };
}

export function usePartialLessonLog(options: PartialLessonLogOptions) {
  const latestOptionsRef = useRef(options);
  const recordedRef = useRef(false);

  useEffect(() => {
    latestOptionsRef.current = options;
  }, [options]);

  const recordPartialLesson = useCallback(() => {
    if (recordedRef.current || typeof window === 'undefined') return;

    const latest = latestOptionsRef.current;
    if (latest.isComplete()) return;

    const completedQuestions = Math.floor(latest.getCompletedQuestions());
    if (completedQuestions <= 0) return;

    recordedRef.current = true;
    const elapsedMinutes = Math.max(1, Math.floor(latest.getElapsedMinutes()));

    recordLearningTime(elapsedMinutes);
    updateStreak(completedQuestions);
    recordSession(latest.mode, completedQuestions, latest.sessionOptions);
  }, []);

  useEffect(() => {
    const handlePageHide = () => {
      recordPartialLesson();
    };

    window.addEventListener('pagehide', handlePageHide);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      recordPartialLesson();
    };
  }, [recordPartialLesson]);
}
