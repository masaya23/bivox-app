'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocalAudio } from '@/hooks/useLocalAudio';
import HardNavLink from '@/components/HardNavLink';
import { AutoSizeText } from '@/components/AutoSizeText';
import { updateStreak } from '@/utils/streak';
import { recordLearningTime } from '@/utils/learningTime';
import { apiFetch } from '@/utils/api';
import ConfettiCelebration from '@/components/ConfettiCelebration';
import MascotComment from '@/components/MascotComment';
import ResultHeader from './ResultHeader';
import LifeIndicator from '@/components/life/LifeIndicator';
import LifeOutModal from '@/components/life/LifeOutModal';
import { useLife } from '@/contexts/LifeContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import type { Sentence } from '@/types/sentence';
import PlayIcon from '@/components/icons/PlayIcon';
import { getLessonPartBadgeClassName } from '@/utils/gradeTheme';
import { recordSession } from '@/utils/sessionLog';
import { useInterstitialOnComplete } from '@/hooks/useInterstitialOnComplete';
import { useTrainerAdBanner } from '@/hooks/useTrainerAdBanner';
import { usePartialLessonLog } from '@/hooks/usePartialLessonLog';

// ダミーデータ（10問）- unit1-p1のセンテンスを使用（MP3ファイルと対応）
const DUMMY_SENTENCES: Sentence[] = [
  { id: 'unit1-p1-s1', jp: '私は学生です。', en: 'I am a student.', tags: ['be動詞'], level: 'A1' },
  { id: 'unit1-p1-s2', jp: '彼は先生ではありません。', en: 'He is not a teacher.', tags: ['be動詞'], level: 'A1' },
  { id: 'unit1-p1-s3', jp: 'あなたは日本人ですか？', en: 'Are you Japanese?', tags: ['be動詞'], level: 'A1' },
  { id: 'unit1-p1-s4', jp: '彼女は私の友達です。', en: 'She is my friend.', tags: ['be動詞'], level: 'A1' },
  { id: 'unit1-p1-s5', jp: 'それは私のバッグではありません。', en: 'It is not my bag.', tags: ['be動詞'], level: 'A1' },
  { id: 'unit1-p1-s6', jp: '私たちは公園にいます。', en: 'We are in the park.', tags: ['be動詞'], level: 'A1' },
  { id: 'unit1-p1-s7', jp: '彼らは忙しいですか？', en: 'Are they busy?', tags: ['be動詞'], level: 'A1' },
  { id: 'unit1-p1-s8', jp: 'これはあなたの本ですか？', en: 'Is this your book?', tags: ['be動詞'], level: 'A1' },
  { id: 'unit1-p1-s9', jp: '私の犬はとてもかわいいです。', en: 'My dog is very cute.', tags: ['be動詞'], level: 'A1' },
  { id: 'unit1-p1-s10', jp: 'ケンはテニス部員です。', en: 'Ken is a tennis team member.', tags: ['be動詞'], level: 'A1' },
];

export const DEFAULT_SHADOWING_SENTENCES = DUMMY_SENTENCES;

type PlaybackState = 'idle' | 'playing-japanese' | 'pause' | 'playing-english' | 'interval';

type PauseSkipContext = {
  index: number;
  runId: number;
  estimatedDuration: number;
  isLast: boolean;
  remainingLifeAfterConsume: number;
};

type QuestionPlaybackContext = {
  index: number;
  runId: number;
  isLast: boolean;
};

interface TrainPageProps {
  initialSentences?: Sentence[];
  pageTitle?: string;
  backLink?: string;
  partSelectLink?: string;
  nextLessonLink?: string;
  gradeId?: string;
  partId?: string;
  partLabel?: string;
}

export default function ShadowingTrainer({
  initialSentences,
  pageTitle,
  backLink = '/',
  partSelectLink,
  nextLessonLink,
  partId,
  gradeId,
  partLabel,
}: TrainPageProps) {
  // ライフシステム
  const { consumeLife, canConsume, isUnlimited } = useLife();
  const [showLifeOutModal, setShowLifeOutModal] = useState(false);

  // サブスクリプション（バックグラウンド再生判定用）
  const { isPremium } = useSubscription();

  // レッスン完了時インタースティシャル広告
  const { showLessonCompleteAd, resetAdShown } = useInterstitialOnComplete();

  // トレーニング画面ではBottomNavがないので、バナー広告のマージンを0に再設定
  useTrainerAdBanner();

  const formatHeaderTitle = (title?: string, currentPartId?: string) => {
    const partMatch = currentPartId?.match(/-p(\d+)/i);
    const partLabelFromId = partMatch ? `Part ${partMatch[1]}` : null;

    if (!title) {
      return { partLabel: partLabelFromId, titleText: 'ベーシックモード' };
    }

    let text = title.trim();
    const titlePartMatch = text.match(/Part\s*\d+/i);
    const partLabel = partLabelFromId || (titlePartMatch ? titlePartMatch[0] : null);

    const prefixMatch = text.match(/^Part\s*\d+\s*[:：]\s*/i);
    if (prefixMatch) {
      text = text.slice(prefixMatch[0].length).trim();
    }

    const trailingMatch = text.match(/\s*-\s*Part\s*\d+\s*$/i);
    if (trailingMatch && trailingMatch.index !== undefined) {
      text = text.slice(0, trailingMatch.index).trim();
    }

    return { partLabel, titleText: text || title };
  };
  const [sentences, setSentences] = useState(
    initialSentences && initialSentences.length > 0
      ? initialSentences
      : DUMMY_SENTENCES
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [pauseDuration, setPauseDuration] = useState(1000); // 英語音声推定長に加算する追加時間（デフォルト1秒）
  const [intervalDuration, setIntervalDuration] = useState(2000); // 次の問題までの間隔2秒
  const [showSettings, setShowSettings] = useState(false);
  const [draftPauseDuration, setDraftPauseDuration] = useState(1000);
  const [draftIntervalDuration, setDraftIntervalDuration] = useState(2000);
  const [draftRate, setDraftRate] = useState(1.0);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [showBgPausedMessage, setShowBgPausedMessage] = useState(false);
  const [isSwitchingQuestion, setIsSwitchingQuestion] = useState(false);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const runIdRef = useRef(0); // 再生シーケンス識別子（途中スキップ時のキャンセル用）
  const switchingQuestionRef = useRef(false);
  const isInBackgroundRef = useRef(false); // バックグラウンド状態
  const wasPlayingBeforeBackgroundRef = useRef(false); // BG移行前に再生中だったか
  const currentIndexRef = useRef(0);
  const playbackStateRef = useRef<PlaybackState>('idle');
  const startTimeRef = useRef<number | null>(null); // 学習開始時刻
  const pauseSkipContextRef = useRef<PauseSkipContext | null>(null);
  const japanesePlaybackContextRef = useRef<QuestionPlaybackContext | null>(null);
  const englishPlaybackContextRef = useRef<PauseSkipContext | null>(null);
  const englishPlaybackSeqRef = useRef(0);
  const currentSentence = sentences[currentIndex];
  const isLastQuestion = currentIndex === sentences.length - 1;
  const consumedIndicesRef = useRef(new Set<number>());
  const totalQuestions = sentences.length;

  // ローカル音声再生
  const { speak: speakEnglish, stop: stopEnglish, isSpeaking: isPlayingEnglish } = useLocalAudio({ lang: 'en' });
  const { speak: speakJapanese, stop: stopJapanese, isSpeaking: isPlayingJapanese } = useLocalAudio({ lang: 'ja' });

  // 英語再生速度
  const [currentRate, setCurrentRate] = useState(1.0);
  const changeRate = useCallback((rate: number) => setCurrentRate(rate), []);
  const rateStatus = draftRate <= 0.9 ? 'slow' : draftRate >= 1.1 ? 'fast' : 'normal';
  const headerTitle = formatHeaderTitle(pageTitle, partId);
  const badgeClass = getLessonPartBadgeClassName();
  const pauseDurationRef = useRef(pauseDuration);
  const intervalDurationRef = useRef(intervalDuration);
  const currentRateRef = useRef(currentRate);

  usePartialLessonLog({
    mode: 'ベーシック',
    getCompletedQuestions: () => Math.min(
      sentences.length,
      Math.max(
        consumedIndicesRef.current.size,
        currentIndexRef.current,
        playbackState === 'idle' ? 0 : currentIndexRef.current + 1
      )
    ),
    getElapsedMinutes: () =>
      startTimeRef.current
        ? Math.max(1, Math.ceil((Date.now() - startTimeRef.current) / 60000))
        : 0,
    isComplete: () => isFinished || startTimeRef.current === null,
    sessionOptions: { gradeId, partLabel },
  });

  // initialSentencesが更新されたら反映
  useEffect(() => {
    if (initialSentences && initialSentences.length > 0) {
      setSentences(initialSentences);
    }
  }, [initialSentences]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    playbackStateRef.current = playbackState;
  }, [playbackState]);

  useEffect(() => {
    if (!showSettings) return;
    setDraftPauseDuration(pauseDuration);
    setDraftIntervalDuration(intervalDuration);
    setDraftRate(currentRate);
  }, [showSettings, pauseDuration, intervalDuration, currentRate]);

  useEffect(() => {
    pauseDurationRef.current = pauseDuration;
  }, [pauseDuration]);

  useEffect(() => {
    intervalDurationRef.current = intervalDuration;
  }, [intervalDuration]);

  useEffect(() => {
    currentRateRef.current = currentRate;
  }, [currentRate]);

  // 設定の読み込み
  useEffect(() => {
    const savedSettings = localStorage.getItem('shadowingSettings');
    if (!savedSettings) return;
    try {
      const settings = JSON.parse(savedSettings);
      if (typeof settings.pauseDuration === 'number') setPauseDuration(settings.pauseDuration);
      if (typeof settings.intervalDuration === 'number') setIntervalDuration(settings.intervalDuration);
      if (typeof settings.currentRate === 'number') changeRate(settings.currentRate);
    } catch {
      // Ignore malformed settings
    }
  }, [changeRate]);

  // 英語音声の長さを推定（初心者向けにやや長め）
  const estimateEnglishDuration = (text: string, rate: number): number => {
    const safeRate = rate > 0 ? rate : 1;
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const punctuationCount = (text.match(/[,.!?]/g) || []).length;
    const baseTimePerWord = 600;
    const adjustedTime = baseTimePerWord / safeRate;
    const punctuationPause = punctuationCount * 250;
    const baseLeadIn = 600;
    return Math.round(words * adjustedTime + punctuationPause + baseLeadIn);
  };

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const completeLesson = useCallback(() => {
    setIsFinished(true);
    setPlaybackState('idle');
    setCurrentPage(0);

    // レッスン完了時に学習記録を保存（問題数を渡す）
    updateStreak(sentences.length);

    // 学習時間を記録（実際の経過時間を計算）
    const elapsedMinutes = startTimeRef.current
      ? Math.max(1, Math.ceil((Date.now() - startTimeRef.current) / 60000))
      : 1;
    recordLearningTime(elapsedMinutes);
    recordSession('ベーシック', sentences.length, { gradeId, partLabel });
    startTimeRef.current = null;

    void showLessonCompleteAd();
  }, [gradeId, partLabel, sentences.length, showLessonCompleteAd]);

  const cancelPlayback = useCallback(async () => {
    runIdRef.current += 1;
    pauseSkipContextRef.current = null;
    japanesePlaybackContextRef.current = null;
    englishPlaybackContextRef.current = null;
    englishPlaybackSeqRef.current += 1;
    clearTimers();
    await Promise.all([stopJapanese(), stopEnglish()]);
    setPlaybackState('idle');
  }, [clearTimers, stopEnglish, stopJapanese]);

  const beginThinkingPause = useCallback(async (context: QuestionPlaybackContext) => {
    if (runIdRef.current !== context.runId) return;
    const sentence = sentences[context.index];
    if (!sentence) return;

    if (
      pauseSkipContextRef.current?.runId === context.runId &&
      pauseSkipContextRef.current?.index === context.index
    ) {
      return;
    }

    japanesePlaybackContextRef.current = null;

    let remainingLifeAfterConsume = Infinity;
    if (!isUnlimited && !consumedIndicesRef.current.has(context.index)) {
      const result = consumeLife();
      if (!result.success) {
        await cancelPlayback();
        setShowLifeOutModal(true);
        return;
      }
      consumedIndicesRef.current.add(context.index);
      remainingLifeAfterConsume = result.remainingLife;
    }

    setPlaybackState('pause');
    const estimatedDuration = estimateEnglishDuration(sentence.en, currentRateRef.current);
    const actualPauseDuration = estimatedDuration + pauseDurationRef.current;
    const pauseContext: PauseSkipContext = {
      index: context.index,
      runId: context.runId,
      estimatedDuration,
      isLast: context.isLast,
      remainingLifeAfterConsume,
    };
    pauseSkipContextRef.current = pauseContext;

    clearTimers();
    timeoutRef.current = setTimeout(async () => {
      if (runIdRef.current !== context.runId) return;
      await playEnglishAndScheduleNextRef.current(pauseContext);
    }, actualPauseDuration);
  }, [cancelPlayback, clearTimers, consumeLife, isUnlimited, sentences]);

  const playEnglishAndScheduleNext = useCallback(async (context: PauseSkipContext) => {
    if (runIdRef.current !== context.runId) return;
    const sentence = sentences[context.index];
    if (!sentence) return;

    const playbackSeq = englishPlaybackSeqRef.current + 1;
    englishPlaybackSeqRef.current = playbackSeq;
    pauseSkipContextRef.current = null;
    englishPlaybackContextRef.current = context;

    clearTimers();
    await stopEnglish();
    if (runIdRef.current !== context.runId || englishPlaybackSeqRef.current !== playbackSeq) return;
    setPlaybackState('playing-english');
    const englishPlayback = speakEnglish(
      sentence.id,
      'en',
      undefined,
      sentence.en,
      currentRateRef.current
    );

    const englishTimeoutMs = Math.max(context.estimatedDuration + 2000, 8000);
    const playbackTimeout = new Promise<void>((resolve) => {
      clearTimers();
      timeoutRef.current = setTimeout(resolve, englishTimeoutMs);
    });
    await Promise.race([englishPlayback, playbackTimeout]);
    await stopEnglish();

    if (runIdRef.current !== context.runId || englishPlaybackSeqRef.current !== playbackSeq) return;
    englishPlaybackContextRef.current = null;
    setPlaybackState('interval');

    clearTimers();
    timeoutRef.current = setTimeout(() => {
      if (runIdRef.current !== context.runId) return;
      if (context.isLast) {
        completeLesson();
      } else {
        if (!isUnlimited && context.remainingLifeAfterConsume <= 0) {
          setPlaybackState('idle');
          setShowLifeOutModal(true);
          return;
        }
        setCurrentIndex(context.index + 1);
        setPlaybackState('idle');
        void playSingleQuestionRef.current(context.index + 1, context.runId);
      }
    }, intervalDurationRef.current);
  }, [clearTimers, completeLesson, isUnlimited, sentences, speakEnglish, stopEnglish]);

  const playSingleQuestionRef = useRef<(index: number, runId: number) => void>(() => {});
  const playEnglishAndScheduleNextRef = useRef<(context: PauseSkipContext) => void>(() => {});

  // シャドーイングシーケンスの実行（1問分）
  const playSingleQuestion = useCallback(async (index: number, runId: number) => {
    if (runIdRef.current !== runId) return;
    const sentence = sentences[index];
    const isLast = index === sentences.length - 1;
    const questionContext: QuestionPlaybackContext = { index, runId, isLast };

    // ★ ライフチェック：音声再生前にライフがあるか確認
    // ライフ0の場合は音声を再生せずにモーダルを表示
    if (!isUnlimited && !canConsume()) {
      await cancelPlayback();
      setShowLifeOutModal(true);
      return;
    }

    // 1. 日本語を読み上げ（完了まで待機）- sentenceIdを使用
    setPlaybackState('playing-japanese');
    japanesePlaybackContextRef.current = questionContext;
    await speakJapanese(sentence.id, 'ja', undefined, sentence.jp, currentRateRef.current);
    if (runIdRef.current !== runId) return;

    // 2. 考える時間へ
    await beginThinkingPause(questionContext);
  }, [beginThinkingPause, canConsume, cancelPlayback, isUnlimited, sentences, speakJapanese]);

  useEffect(() => {
    playSingleQuestionRef.current = (index: number, runId: number) => {
      void playSingleQuestion(index, runId);
    };
  }, [playSingleQuestion]);

  useEffect(() => {
    playEnglishAndScheduleNextRef.current = (context: PauseSkipContext) => {
      void playEnglishAndScheduleNext(context);
    };
  }, [playEnglishAndScheduleNext]);

  const skipPauseToEnglish = useCallback(() => {
    if (playbackState !== 'pause' || !pauseSkipContextRef.current) return;
    const context = pauseSkipContextRef.current;
    clearTimers();
    void playEnglishAndScheduleNext(context);
  }, [clearTimers, playEnglishAndScheduleNext, playbackState]);

  const skipJapaneseToThinking = useCallback(async () => {
    if (playbackStateRef.current !== 'playing-japanese' || !japanesePlaybackContextRef.current) return;
    const context = japanesePlaybackContextRef.current;
    await stopJapanese();
    if (runIdRef.current !== context.runId) return;
    await beginThinkingPause(context);
  }, [beginThinkingPause, stopJapanese]);

  const replayEnglishAnswer = useCallback(() => {
    if (playbackStateRef.current !== 'playing-english' || !englishPlaybackContextRef.current) return;
    const context = englishPlaybackContextRef.current;
    clearTimers();
    void playEnglishAndScheduleNext(context);
  }, [clearTimers, playEnglishAndScheduleNext]);

  const handleLearningCardClick = useCallback(() => {
    if (playbackStateRef.current === 'playing-japanese') {
      void skipJapaneseToThinking();
      return;
    }
    if (playbackStateRef.current === 'pause') {
      skipPauseToEnglish();
      return;
    }
    if (playbackStateRef.current === 'playing-english') {
      replayEnglishAnswer();
    }
  }, [replayEnglishAnswer, skipJapaneseToThinking, skipPauseToEnglish]);

  // 任意のインデックスから再生を開始
  const startFromIndex = async (index: number) => {
    if (switchingQuestionRef.current) return;
    switchingQuestionRef.current = true;
    setIsSwitchingQuestion(true);

    await cancelPlayback();
    const runId = runIdRef.current;
    setIsFinished(false);
    setCurrentIndex(index);
    currentIndexRef.current = index;
    switchingQuestionRef.current = false;
    setIsSwitchingQuestion(false);
    void playSingleQuestion(index, runId);
  };

  // シャドーイングシーケンスの開始
  const startShadowing = async () => {
    if (playbackState !== 'idle') return;

    // ライフ0の場合は開始せずにモーダルを表示
    if (!isUnlimited && !canConsume()) {
      setShowLifeOutModal(true);
      return;
    }

    // 学習開始時刻を記録
    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now();
    }
    // すでに途中の問題にいる場合はそこから再開、完了後の再開は0から
    const startIndex = isFinished ? 0 : currentIndex;
    if (isFinished) {
      resetAdShown();
      consumedIndicesRef.current.clear();
    }
    await startFromIndex(startIndex);
  };

  // 次の問題へ
  const nextQuestion = async () => {
    if (switchingQuestionRef.current) return;
    window.scrollTo(0, 0);
    const nextIndex = Math.min(currentIndexRef.current + 1, sentences.length - 1);
    if (nextIndex === currentIndexRef.current) {
      await cancelPlayback();
      completeLesson();
      return;
    }
    await startFromIndex(nextIndex);
  };

  // 前の問題へ
  const prevQuestion = async () => {
    if (switchingQuestionRef.current) return;
    const prevIndex = Math.max(0, currentIndexRef.current - 1);
    if (prevIndex === currentIndexRef.current) return;
    await startFromIndex(prevIndex);
  };

  // 再生を一時停止
  const pauseShadowing = async () => {
    await cancelPlayback();
  };

  const openSettings = async () => {
    await cancelPlayback();
    setShowSettings(true);
  };

  // 次の問題までスキップ
  const skipToNext = () => {
    void nextQuestion();
  };

  // 前の問題に戻る
  const skipToPrev = () => {
    void prevQuestion();
  };

  const hasStartedCurrentSession = startTimeRef.current !== null || currentIndex > 0 || consumedIndicesRef.current.size > 0;
  const startButtonLabel = playbackState === 'idle'
    ? (hasStartedCurrentSession ? 'この問題を再開' : '練習開始')
    : '停止';

  // クリーンアップ
  useEffect(() => {
    return () => {
      void stopJapanese();
      void stopEnglish();
      clearTimers();
    };
  }, [clearTimers, stopJapanese, stopEnglish]);

  // バックグラウンド再生制御
  useEffect(() => {
    const handleVisibility = () => {
      const inBg = document.visibilityState === 'hidden';
      const wasPlaying = playbackState !== 'idle';

      if (inBg) {
        // バックグラウンドに入った
        wasPlayingBeforeBackgroundRef.current = wasPlaying;
        isInBackgroundRef.current = true;

        // 無料ユーザー：バックグラウンドで再生停止
        if (!isPremium() && wasPlaying) {
          void cancelPlayback();
        }
      } else {
        // フォアグラウンドに復帰
        isInBackgroundRef.current = false;

        // 無料ユーザー：再生中だった場合にトースト表示
        if (!isPremium() && wasPlayingBeforeBackgroundRef.current) {
          setShowBgPausedMessage(true);
          setTimeout(() => setShowBgPausedMessage(false), 3000);
        }
        wasPlayingBeforeBackgroundRef.current = false;
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [cancelPlayback, playbackState, isPremium]);

  // MediaSession API（ロック画面コントロール）
  useEffect(() => {
    if (!isPremium() || !('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: 'ベーシックモード',
      artist: 'Bivox - 瞬間英会話 -',
    });

    navigator.mediaSession.setActionHandler('play', () => { void startShadowing(); });
    navigator.mediaSession.setActionHandler('pause', () => { void pauseShadowing(); });
    navigator.mediaSession.setActionHandler('nexttrack', () => skipToNext());
    navigator.mediaSession.setActionHandler('previoustrack', () => skipToPrev());

    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPremium]);

  // MediaSession 再生状態の同期
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = playbackState === 'idle' ? 'paused' : 'playing';
  }, [playbackState]);

  // 設定の保存
  const saveSettings = () => {
    setPauseDuration(draftPauseDuration);
    setIntervalDuration(draftIntervalDuration);
    changeRate(draftRate);
    const settings = {
      pauseDuration: draftPauseDuration,
      intervalDuration: draftIntervalDuration,
      currentRate: draftRate,
    };
    localStorage.setItem('shadowingSettings', JSON.stringify(settings));
    setShowSettings(false);
  };

  // 終了画面
  if (isFinished) {
    const ITEMS_PER_PAGE = 10;
    const totalPages = Math.ceil(sentences.length / ITEMS_PER_PAGE);
    const startIndex = currentPage * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, sentences.length);
    const currentSentences = sentences.slice(startIndex, endIndex);

    return (
      <div className="min-h-screen bg-[#F4F2F8] flex justify-center">
        {/* モバイルコンテナ - 紙吹雪とテキストの範囲を制限 */}
        <div className="relative w-full max-w-[430px] h-screen overflow-hidden shadow-xl">
          {/* Confetti演出 - コンテナ内に制限 */}
          <ConfettiCelebration
            show={true}
            message="GREAT!"
            subMessage="トレーニング完了！"
            showText={false}
          />

          {/* スクロール可能なコンテンツエリア */}
          <div className="h-full overflow-y-auto pb-8">
            <ResultHeader message="GREAT" />

            <div className="px-4">
            {/* マスコットコメント（ベーシックモードは常に100%扱い） */}
            <div className="max-w-md w-full mx-auto mb-4">
              <MascotComment accuracyRate={100} />
            </div>

            <div className="mb-6 flex flex-col">
              {/* 1. Primary: 次のレッスン */}
              {nextLessonLink ? (
                <HardNavLink
                  href={nextLessonLink}
                  className="flex items-center justify-center gap-2 w-full bg-blue-500 text-white font-bold py-4 rounded-xl active:scale-[0.98] transition-transform text-base"
                >
                  次のレッスン
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg>
                </HardNavLink>
              ) : (
                <HardNavLink
                  href={partSelectLink ?? backLink}
                  className="flex items-center justify-center gap-2 w-full bg-blue-500 text-white font-bold py-4 rounded-xl active:scale-[0.98] transition-transform text-base"
                >
                  {partSelectLink ? 'Part選択に戻る' : '戻る'}
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg>
                </HardNavLink>
              )}

              {/* 2. Secondary: もう一度 */}
              <button
                onClick={startShadowing}
                className="flex items-center justify-center gap-2 w-full mt-3 bg-white border-2 border-blue-400 text-blue-600 font-bold py-4 rounded-xl active:scale-[0.98] transition-transform text-base"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35A7.96 7.96 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" /></svg>
                もう一度
              </button>

              {/* 3. Tertiary: テキストリンク */}
              <div className="flex items-center justify-around mt-6">
                <HardNavLink
                  href={partSelectLink ?? backLink}
                  className="text-xs text-gray-400 font-semibold active:text-gray-600 transition-colors"
                >
                  ← Part選択
                </HardNavLink>
                <HardNavLink
                  href="/home"
                  className="text-xs text-gray-400 font-semibold active:text-gray-600 transition-colors"
                >
                  ホームに戻る
                </HardNavLink>
              </div>
            </div>

            {/* 練習した文章一覧 */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-800">
                  練習した文章
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 0))}
                    disabled={currentPage === 0}
                    className={`px-2 py-1 rounded text-xs font-semibold ${currentPage === 0
                      ? 'bg-gray-200 text-gray-400'
                      : 'bg-white text-gray-700'
                      }`}
                  >
                    ←
                  </button>
                  <span className="text-xs text-gray-600">
                    {currentPage + 1}/{totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1))}
                    disabled={currentPage === totalPages - 1}
                    className={`px-2 py-1 rounded text-xs font-semibold ${currentPage === totalPages - 1
                      ? 'bg-gray-200 text-gray-400'
                      : 'bg-white text-gray-700'
                      }`}
                  >
                    →
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {currentSentences.map((sentence, index) => (
                  <div
                    key={`${sentence.id}-${index}`}
                    className="bg-white rounded-xl p-3 shadow-sm"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-gray-400">
                        {startIndex + index + 1}
                      </span>
                      <span className="px-1.5 py-0.5 text-xs font-semibold rounded bg-purple-100 text-purple-700">
                        {sentence.level}
                      </span>
                      {sentence.tags.slice(0, 1).map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 text-xs rounded bg-blue-50 text-blue-700">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-600 mb-0.5">{sentence.jp}</p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-gray-900 font-semibold">{sentence.en}</p>
                      <button
                        onClick={() => {
                          stopEnglish();
                          speakEnglish(sentence.id, 'en', undefined, sentence.en, 1.0);
                        }}
                        disabled={isPlayingEnglish}
                        aria-label="英語音声を再生"
                        className="w-7 h-7 min-w-[1.75rem] min-h-[1.75rem] flex-shrink-0 bg-green-100 text-green-600 rounded-full flex items-center justify-center hover:bg-green-200 disabled:opacity-50 text-xs transition-all"
                      >
                        <PlayIcon />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            </div>

          </div>

          {/* ライフ切れモーダル（完了画面用） */}
          <LifeOutModal
            isOpen={showLifeOutModal}
            onClose={() => setShowLifeOutModal(false)}
            onLifeRecovered={() => {
              setShowLifeOutModal(false);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-200 flex justify-center">
      <div className="w-full max-w-[430px] min-h-screen bg-gray-50 shadow-xl flex flex-col relative">

        {/* バックグラウンド再生停止トースト（無料ユーザー） */}
        {showBgPausedMessage && (
          <div className="absolute top-2 left-4 right-4 z-50 bg-gray-800 text-white text-xs font-semibold text-center py-2 px-4 rounded-xl shadow-lg animate-fade-in">
            バックグラウンド再生はプレミアム機能です
          </div>
        )}

        {/* ヘッダー */}
        <header className="bg-white px-4 py-3 sticky top-0 z-30 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <HardNavLink
              href={backLink}
              onClick={() => cancelPlayback()}
              className="text-gray-600 font-semibold text-sm min-w-[50px]"
            >
              ← 戻る
            </HardNavLink>
            <div className="text-center flex-1 px-2">
              {headerTitle.partLabel && (
                <span className={badgeClass}>
                  {headerTitle.partLabel}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {/* ライフインジケーター（タイマーなし） */}
              <LifeIndicator variant="compact" showTimer={false} />
              <button
                onClick={() => { void openSettings(); }}
                aria-label="設定"
                className="w-8 h-8 flex items-center justify-center"
              >
                <svg
                  className="w-6 h-6 text-gray-500"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.5.5 0 00.12-.61l-1.92-3.32a.5.5 0 00-.6-.22l-2.39.96a7.42 7.42 0 00-1.62-.94l-.36-2.54a.5.5 0 00-.47-.4h-3.84a.5.5 0 00-.47.4l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96a.5.5 0 00-.6.22l-1.92 3.32a.5.5 0 00.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.5.5 0 00-.12.61l1.92 3.32a.5.5 0 00.6.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.03.23.23.4.47.4h3.84c.24 0 .44-.17.47-.4l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96a.5.5 0 00.6-.22l1.92-3.32a.5.5 0 00-.12-.61l-2.03-1.58zM12 15.5a3.5 3.5 0 110-7 3.5 3.5 0 010 7z" />
                </svg>
              </button>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <HardNavLink
              href={partSelectLink ?? backLink}
              onClick={() => cancelPlayback()}
              className="py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold text-center active:scale-[0.98] transition-transform"
            >
              Part選択
            </HardNavLink>
            <HardNavLink
              href="/"
              onClick={() => cancelPlayback()}
              className="py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold text-center active:scale-[0.98] transition-transform"
            >
              ホームに戻る
            </HardNavLink>
          </div>
        </header>

      {/* メインコンテンツ */}
      <main className="flex-1 flex flex-col p-4 pb-[70px]">
        {/* 進捗バー */}
        <div className="mb-4 space-y-1">
          <div className="text-center text-xs font-semibold text-gray-500 tabular-nums">
            {currentIndex + 1} / {totalQuestions}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
            />
          </div>
        </div>

        {/* カード */}
        <div className="flex-1 bg-white rounded-2xl shadow-md p-4 flex flex-col">
          {/* レベルとタグ */}
          <div className="flex gap-1.5 mb-4 flex-wrap">
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded font-semibold">
              {currentSentence.level}
            </span>
            {currentSentence.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                {tag}
              </span>
            ))}
          </div>

          {/* 状態表示 */}
          <div
            className={`flex-1 flex flex-col justify-center min-h-[200px] ${
              playbackState === 'playing-japanese' || playbackState === 'pause' || playbackState === 'playing-english'
                ? 'cursor-pointer active:scale-[0.995] transition-transform'
                : ''
            }`}
            onClick={handleLearningCardClick}
          >
            {playbackState === 'idle' && (
              <>
                <p className="text-xs text-gray-500 mb-2 text-center">
                  {hasStartedCurrentSession ? 'この問題から再開できます' : '日本語を聞いて、英語で答えてください'}
                </p>
                <h2 className="text-2xl font-bold text-gray-800 text-center">
                  準備完了
                </h2>
              </>
            )}

            {playbackState === 'playing-japanese' && (
              <>
                <p className="text-xs text-blue-600 mb-2 text-center font-semibold">
                  日本語を聞いています...
                </p>
                <AutoSizeText text={currentSentence.jp} maxFontSize={30} className="text-gray-800" />
                <p className="text-xs text-gray-400 mt-3 text-center font-semibold">
                  カードをタップであなたの番へ
                </p>
              </>
            )}

            {playbackState === 'pause' && (
              <>
                <div className="text-lg mb-2 text-center font-black text-orange-700">あなたの番です</div>
                <p className="text-xs text-orange-600 mb-2 text-center font-semibold">
                  英語で言ってみましょう
                </p>
                <AutoSizeText text={currentSentence.jp} maxFontSize={30} className="text-gray-800" />
                <p className="text-xs text-gray-400 mt-3 text-center font-semibold leading-relaxed">
                  まもなく答えが流れます<br />
                  すぐ確認したい場合はタップ
                </p>
              </>
            )}

            {playbackState === 'playing-english' && (
              <>
                <div className="text-lg mb-2 text-center font-black text-green-700">英語の答え</div>
                <AutoSizeText text={currentSentence.en} maxFontSize={30} className="text-gray-800" />
                <p className="text-xs text-gray-400 mt-3 text-center font-semibold">
                  カードをタップでもう一度聞く
                </p>
              </>
            )}

            {playbackState === 'interval' && (
              <>
                <div className="text-2xl mb-2 text-center font-black text-purple-700">NEXT</div>
                <p className="text-xs text-purple-600 mb-2 text-center font-semibold">
                  次の問題まで少し休憩...
                </p>
              </>
            )}
          </div>

          {/* コントロールボタン */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button
              onClick={playbackState === 'idle' ? startShadowing : pauseShadowing}
              disabled={isSwitchingQuestion}
              className={`col-span-2 py-3 rounded-xl text-white font-bold text-base active:scale-[0.98] transition-transform ${playbackState === 'idle'
                ? 'bg-gradient-to-r from-purple-500 to-blue-500'
                : 'bg-gray-400'
                }`}
            >
              {startButtonLabel}
            </button>

            <button
              onClick={skipToPrev}
              disabled={currentIndex === 0 || isSwitchingQuestion}
              className={`py-3 rounded-xl font-bold text-sm active:scale-[0.98] transition-transform ${currentIndex === 0
                ? 'bg-gray-100 text-gray-400'
                : 'bg-white border-2 border-gray-200 text-gray-700'
                }`}
            >
              ← 前の問題
            </button>

            <button
              onClick={skipToNext}
              disabled={isSwitchingQuestion}
              className="py-3 rounded-xl font-bold text-sm bg-white border-2 border-gray-200 text-gray-700 active:scale-[0.98] transition-transform"
            >
              次の問題 →
            </button>

          </div>
        </div>
      </main>

      {/* 設定モーダル */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end justify-center z-50">
          <div className="bg-white rounded-t-3xl shadow-2xl p-4 pb-[70px] w-full max-w-[430px] max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">設定</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 text-xl font-bold w-8 h-8"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-gray-700 text-sm">考える時間</label>
                  <span className="text-xs text-gray-500">+{draftPauseDuration / 1000}秒</span>
                </div>
                <p className="text-xs text-gray-400 mb-1">英語音声と同じ長さ + 追加時間</p>
                <p className="text-[11px] text-gray-400 mb-2">例：英語音声が2秒の場合、+1秒なら考える時間は3秒です</p>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={draftPauseDuration / 1000}
                  onChange={(e) => setDraftPauseDuration(Number(e.target.value) * 1000)}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-gray-700 text-sm">次の問題までの間隔</label>
                  <span className="text-xs text-gray-500">{draftIntervalDuration / 1000}秒</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.5"
                  value={draftIntervalDuration / 1000}
                  onChange={(e) => setDraftIntervalDuration(Number(e.target.value) * 1000)}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-gray-700 text-sm">音声の再生速度</label>
                  <span className="text-xs text-gray-500">{draftRate.toFixed(2)}x</span>
                </div>
                <div className="flex items-center gap-1 rounded-full bg-blue-50 p-1 border border-blue-100">
                  <button
                    onClick={() => setDraftRate(0.85)}
                    className={`flex-1 px-2 py-2 text-xs rounded-full font-semibold ${
                      rateStatus === 'slow' ? 'bg-blue-600 text-white' : 'text-blue-700'
                    }`}
                  >
                    遅
                  </button>
                  <button
                    onClick={() => setDraftRate(1)}
                    className={`flex-1 px-2 py-2 text-xs rounded-full font-semibold ${
                      rateStatus === 'normal' ? 'bg-blue-600 text-white' : 'text-blue-700'
                    }`}
                  >
                    等速
                  </button>
                  <button
                    onClick={() => setDraftRate(1.15)}
                    className={`flex-1 px-2 py-2 text-xs rounded-full font-semibold ${
                      rateStatus === 'fast' ? 'bg-blue-600 text-white' : 'text-blue-700'
                    }`}
                  >
                    速
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={saveSettings}
                className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold py-3 rounded-xl"
              >
                保存
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI質問ダイアログ */}
      {showAIDialog && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end justify-center z-50">
          <div className="bg-white rounded-t-3xl shadow-2xl p-4 w-full max-w-[430px] max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-800">AIに質問</h3>
              <button
                onClick={() => {
                  setShowAIDialog(false);
                  setAiQuestion('');
                  setAiResponse('');
                }}
                className="text-gray-400 text-xl font-bold w-8 h-8"
              >
                ×
              </button>
            </div>

            <div className="mb-3">
              <p className="text-gray-600 text-xs mb-2">
                文法、単語、発音などについて質問できます。
              </p>
              <textarea
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                placeholder="例：「look forward to」の使い方を教えてください"
                className="w-full h-24 p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 resize-none text-sm"
                disabled={isAiLoading}
              />
            </div>

            {aiResponse && (
              <div className="mb-3 p-3 bg-blue-50 border-2 border-blue-200 rounded-xl">
                <h4 className="font-bold text-gray-800 text-sm mb-1">回答</h4>
                <div className="text-gray-700 text-sm whitespace-pre-wrap">
                  {aiResponse}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!aiQuestion.trim()) return;
                  setIsAiLoading(true);
                  try {
                    const response = await apiFetch('/api/gpt', {
                      method: 'POST',
                      body: JSON.stringify({
                        message: aiQuestion,
                        context: sentences.map((s) => `${s.jp} = ${s.en}`).join('\n'),
                      }),
                    });
                    const data = await response.json();
                    setAiResponse(data.message);
                  } catch (error) {
                    console.error('Error fetching AI response:', error);
                    setAiResponse('エラーが発生しました。');
                  } finally {
                    setIsAiLoading(false);
                  }
                }}
                disabled={isAiLoading || !aiQuestion.trim()}
                className={`flex-1 bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold py-3 rounded-xl ${
                  isAiLoading || !aiQuestion.trim() ? 'opacity-60' : ''
                }`}
              >
                {isAiLoading ? '送信中...' : '質問を送信'}
              </button>
              <button
                onClick={() => setShowAIDialog(false)}
                className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ライフ切れモーダル */}
      <LifeOutModal
        isOpen={showLifeOutModal}
        onClose={() => setShowLifeOutModal(false)}
        onLifeRecovered={() => {
          // ライフ回復後、練習を再開できるようにする
          setShowLifeOutModal(false);
        }}
      />
      </div>
    </div>
  );
}
