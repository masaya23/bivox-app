'use client';

import { useEffect, useRef, useState } from 'react';
import HardNavLink from '@/components/HardNavLink';
import { useLocalAudio } from '@/hooks/useLocalAudio';
import { useWhisperRecognition } from '@/hooks/useWhisperRecognition';
import { updateStreak } from '@/utils/streak';
import { recordLearningTime } from '@/utils/learningTime';
import { recordSession } from '@/utils/sessionLog';
import { apiFetch } from '@/utils/api';
import ConfettiCelebration from '@/components/ConfettiCelebration';
import MascotComment from '@/components/MascotComment';
import ResultHeader from './ResultHeader';
import type { Sentence } from '@/types/sentence';
import { getLessonPartBadgeClassName } from '@/utils/gradeTheme';
import PlayIcon from '@/components/icons/PlayIcon';
import SpeakerIcon from '@/components/icons/SpeakerIcon';
import { useInterstitialOnComplete } from '@/hooks/useInterstitialOnComplete';

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

export const DEFAULT_SPEAKING_SENTENCES = DUMMY_SENTENCES;

interface SpeakingTrainerProps {
  initialSentences?: Sentence[];
  pageTitle?: string;
  backLink?: string;
  partSelectLink?: string;
  nextLessonLink?: string;
  gradeId?: string;
  partId?: string;
  partTitle?: string; // Part名（例: "be動詞の否定文"）- AI解説の文法テーマに使用
  partLabel?: string; // "Part1", "まとめ" など
  onComplete?: () => void;
  isTutorialMode?: boolean;
  autoStart?: boolean;
}

interface AIEvaluation {
  score: number;
  isCorrect: boolean;
  meaningCorrect: boolean;
  grammarCorrect: boolean;
  feedback: string;
  correction: string;
  correctedUserAnswer?: string; // ユーザーの回答を最小限の修正で直した英文
  explanation: string;
  encouragement: string;
  modelAnswers?: string[]; // 複数の正解例（2-3パターン）
  naturalExpressions?: string[];
  grammarRule?: string;
  nuanceDifference?: string;
  mistakeAnalysis?: string;
  // 未回答モード専用フィールド
  patternJa?: string;
  breakdownJa?: string;
  keyPointJa?: string;
}

// 各問題の結果を保存するインターフェース
interface QuestionResult {
  sentence: Sentence;
  userAnswer: string;
  aiEvaluation: AIEvaluation | null;
  // 初回回答の結果（リトライしても変わらない）
  initialStatus: 'correct' | 'incorrect';
  // 最終回答の結果（リトライで更新される）
  finalStatus: 'correct' | 'incorrect';
  // 最終回答のユーザー入力
  finalUserAnswer: string;
  // 最終回答のAI評価
  finalAiEvaluation: AIEvaluation | null;
  isNoSpeech: boolean;
}

// 単語レベルで差分を計算する関数（LCS ベースでより正確な差分）
interface WordDiffResult {
  userDiff: { word: string; type: 'correct' | 'wrong' | 'missing' }[];
  correctionDiff: { word: string; type: 'correct' | 'added' }[];
}

function getWordDiff(userText: string, correctText: string): WordDiffResult {
  // 単語を抽出（句読点を保持しつつ分割、"-"のみのトークンは除外）
  const tokenize = (text: string) => text.split(/\s+/).filter(t => Boolean(t) && !/^[-–—]+$/.test(t));
  const normalizeWord = (word: string) => word.toLowerCase().replace(/[^\w]/g, '');

  const userWords = tokenize(userText);
  const correctWords = tokenize(correctText);

  const userNormalized = userWords.map(normalizeWord);
  const correctNormalized = correctWords.map(normalizeWord);

  // LCSを計算してマッチする単語を見つける
  const lcsMatrix: number[][] = Array(userNormalized.length + 1)
    .fill(null)
    .map(() => Array(correctNormalized.length + 1).fill(0));

  for (let i = 1; i <= userNormalized.length; i++) {
    for (let j = 1; j <= correctNormalized.length; j++) {
      if (userNormalized[i - 1] === correctNormalized[j - 1]) {
        lcsMatrix[i][j] = lcsMatrix[i - 1][j - 1] + 1;
      } else {
        lcsMatrix[i][j] = Math.max(lcsMatrix[i - 1][j], lcsMatrix[i][j - 1]);
      }
    }
  }

  // バックトラックしてマッチを見つける
  const userMatched = new Set<number>();
  const correctMatched = new Set<number>();
  let i = userNormalized.length;
  let j = correctNormalized.length;

  while (i > 0 && j > 0) {
    if (userNormalized[i - 1] === correctNormalized[j - 1]) {
      userMatched.add(i - 1);
      correctMatched.add(j - 1);
      i--;
      j--;
    } else if (lcsMatrix[i - 1][j] > lcsMatrix[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  // ユーザー回答の差分を生成（間違った単語はオレンジ）
  const userDiff = userWords.map((word, idx) => ({
    word,
    type: userMatched.has(idx) ? 'correct' as const : 'wrong' as const,
  }));

  // 訂正後の差分を生成（追加された単語はティール）
  const correctionDiff = correctWords.map((word, idx) => ({
    word,
    type: correctMatched.has(idx) ? 'correct' as const : 'added' as const,
  }));

  return { userDiff, correctionDiff };
}

export default function SpeakingTrainer({
  initialSentences,
  pageTitle,
  backLink = '/train',
  partSelectLink,
  nextLessonLink,
  partId,
  partTitle,
  gradeId,
  partLabel,
  onComplete,
  isTutorialMode = false,
  autoStart = true,
}: SpeakingTrainerProps) {
  // レッスン完了時インタースティシャル広告
  const { showLessonCompleteAd } = useInterstitialOnComplete();

  const [sentences, setSentences] = useState<Sentence[]>(
    initialSentences && initialSentences.length > 0 ? initialSentences : DUMMY_SENTENCES
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [browserSupported, setBrowserSupported] = useState(true);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);

  // 回答関連
  const [recognizedText, setRecognizedText] = useState('');
  const [editableText, setEditableText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [hasJudged, setHasJudged] = useState(false);
  const [similarity, setSimilarity] = useState<number | null>(null);

  // AI評価
  const [aiEvaluation, setAiEvaluation] = useState<AIEvaluation | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [apiRetryFn, setApiRetryFn] = useState<(() => void) | null>(null);

  // 回答例のナビゲーション
  const [answerExampleIndex, setAnswerExampleIndex] = useState(0);

  // 答えを見るモード
  const [showAnswer, setShowAnswer] = useState(false);

  // 無音（未回答）フラグ
  const [isNoSpeech, setIsNoSpeech] = useState(false);

  // 各問題の結果を保存
  const [questionResults, setQuestionResults] = useState<QuestionResult[]>([]);

  // 復習モード
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [reviewQuestions, setReviewQuestions] = useState<QuestionResult[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [shuffledWords, setShuffledWords] = useState<string[]>([]);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [isReviewAnswerShown, setIsReviewAnswerShown] = useState(false);

  // 履歴カードの展開状態
  const [expandedCardIndex, setExpandedCardIndex] = useState<number | null>(null);
  const [historyPage, setHistoryPage] = useState(0);

  // ユーザーがページと操作したかどうか（autoplay制限対策）
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // ローカル音声再生
  const { speak: speakJapanese, stop: stopJapanese, isSpeaking: isPlayingJapanese } = useLocalAudio({ lang: 'ja' });
  const { speak: speakEnglish, stop: stopEnglish, isSpeaking: isPlayingEnglish } = useLocalAudio({ lang: 'en' });
  const whisper = useWhisperRecognition();
  const isTranscribing = whisper.isTranscribing;

  // TTS再生状態
  const [isTTSSpeaking, setIsTTSSpeaking] = useState(false);

  const hasNoSpeechExplanation = Boolean(
    aiEvaluation?.patternJa ||
    aiEvaluation?.breakdownJa ||
    aiEvaluation?.keyPointJa ||
    (aiEvaluation?.naturalExpressions && aiEvaluation.naturalExpressions.length > 1)
  );
  const hasAnswerExplanation = Boolean(
    aiEvaluation?.mistakeAnalysis ||
    aiEvaluation?.grammarRule ||
    aiEvaluation?.nuanceDifference ||
    aiEvaluation?.feedback
  );
  const historyPageSize = 10;
  const historyPageCount = Math.ceil(questionResults.length / historyPageSize);
  const safeHistoryPage = Math.min(historyPage, Math.max(0, historyPageCount - 1));
  const historyStartIndex = safeHistoryPage * historyPageSize;
  const pagedQuestionResults = questionResults.slice(
    historyStartIndex,
    historyStartIndex + historyPageSize
  );

  // 任意のテキストをTTSで読み上げる関数
  const speakText = (text: string, lang: string = 'en-US') => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    // 既存の再生を停止
    window.speechSynthesis.cancel();
    stopEnglish();

    const doSpeak = () => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9;

      // Android WebView向け: 適切なvoiceを選択
      const voices = window.speechSynthesis.getVoices();
      const matchingVoice = voices.find(v => v.lang.startsWith(lang.split('-')[0]));
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }

      utterance.onstart = () => setIsTTSSpeaking(true);
      utterance.onend = () => setIsTTSSpeaking(false);
      utterance.onerror = () => setIsTTSSpeaking(false);

      window.speechSynthesis.speak(utterance);
    };

    // Android WebViewではvoicesが非同期ロードされるため待機
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      doSpeak();
    } else {
      // voicesがまだロードされていない場合はイベントを待つ
      const onVoicesChanged = () => {
        window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
        doSpeak();
      };
      window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
      // タイムアウト: 1秒以内にvoicesがロードされなければそのまま実行
      setTimeout(() => {
        window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
        if (!isTTSSpeaking) {
          doSpeak();
        }
      }, 1000);
    }
  };

  // TTS停止関数
  const stopTTS = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsTTSSpeaking(false);
    }
  };

  const startTimeRef = useRef<number | null>(null); // 学習開始時刻
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null); // 録音開始保険タイマー
  const shouldAutoRecordRef = useRef<boolean>(false); // 自動録音すべきかのフラグ
  const currentSentence = sentences[currentIndex];

  // 初期化
  useEffect(() => {
    if (initialSentences && initialSentences.length > 0) {
      setSentences(initialSentences);
      setCurrentIndex(0);
    }
    // 学習開始時刻を記録
    startTimeRef.current = Date.now();
  }, [initialSentences]);

  // Whisper録音を停止
  const finishRecording = () => {
    whisper.stopListening();
    setIsListening(false);
  };

  /** Whisper録音を開始（コールバックで結果を受け取る） */
  const startWhisperRecording = (expectedText?: string) => {
    if (isListening || isTranscribing) return false;
    whisper.startListening({
      expectedText,
      silenceTimeout: 2,
      noSpeechTimeout: 10,
      onResult: (text: string) => {
        setRecognizedText(text);
        setEditableText(text);
        setIsListening(false);
      },
      onNoSpeech: () => {
        setIsListening(false);
        setIsNoSpeech(true);
      },
      onError: (msg: string) => {
        setIsListening(false);
        setRecognitionError(msg);
      },
    });
    setIsListening(true);
    setRecognitionError(null);
    shouldAutoRecordRef.current = false;
    return true;
  };

  // 録音を開始するヘルパー関数（重複防止付き）
  const startAutoRecording = () => {
    if (isListening || isTranscribing || hasJudged || showAnswer || isPlayingJapanese) {
      return false;
    }
    return startWhisperRecording(currentSentence?.en);
  };

  // Safety Timeout をクリアするヘルパー
  const clearSafetyTimeout = () => {
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }
  };

  // 問題が変わった時に日本語を自動再生し、終了後に自動録音開始
  // ※ブラウザのautoplay制限により初回は再生されない場合がある（その場合はエラーを無視）
  useEffect(() => {
    // autoStartがfalseの場合は自動再生しない
    if (!autoStart) return;

    // 前回のSafety Timeoutをクリア
    clearSafetyTimeout();

    stopJapanese();
    stopEnglish();
    setIsNoSpeech(false);
    shouldAutoRecordRef.current = true; // 自動録音フラグをON

    const playAndRecord = async () => {
      try {
        await speakJapanese(currentSentence.id, 'ja', undefined, currentSentence.jp);
        // 日本語再生終了後、少し待ってから自動録音開始（重複防止のため遅延）
        setTimeout(() => {
          if (shouldAutoRecordRef.current && !isPlayingJapanese) {
            startAutoRecording();
          }
        }, 800);
      } catch {
        // ブラウザのautoplay制限によるエラーは無視
        // Safety Timeout: 音声が再生できなかった場合も2秒後に録音を試みる
        safetyTimeoutRef.current = setTimeout(() => {
          if (
            shouldAutoRecordRef.current &&
            !isListening &&
            !hasJudged &&
            !showAnswer &&
            !isPlayingJapanese
          ) {
            startAutoRecording();
          }
        }, 2000);
      }
    };

    playAndRecord();

    // クリーンアップ
    return () => {
      clearSafetyTimeout();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, currentSentence.id, autoStart]);

  // 無音時の自動AI解説取得
  useEffect(() => {
    if (!isNoSpeech || showAnswer) return;

    const getNoSpeechEvaluation = async () => {
      setIsAiLoading(true);
      setHasJudged(true);
      setEditableText('（未回答）');
      setApiRetryFn(null);

      // リトライ付きAPI呼び出し（最大6回）
      const MAX_NS_RETRIES = 5;
      for (let attempt = 0; attempt <= MAX_NS_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            setLoadingMessage(`サーバー接続中...（リトライ ${attempt}/${MAX_NS_RETRIES}）`);
          }
          const response = await apiFetch('/api/evaluate-speaking', {
            method: 'POST',
            body: JSON.stringify({
              japaneseText: currentSentence.jp,
              correctAnswer: currentSentence.en,
              userAnswer: '（未回答・無音）',
              partTitle,
            }),
          });
          const data = await response.json();

          if (!response.ok || !data.success) {
            throw new Error(data.error || 'AI評価に失敗しました');
          }

          const evaluation = data.evaluation;
          setLoadingMessage(null);
          setAiEvaluation(evaluation);
          setSimilarity(0);

          // 無音（未回答）も結果として保存
          setQuestionResults((prev) => {
            if (prev.length > currentIndex) {
              const updated = [...prev];
              updated[currentIndex] = {
                ...updated[currentIndex],
                finalStatus: 'incorrect',
                finalUserAnswer: '（未回答）',
                finalAiEvaluation: evaluation,
                isNoSpeech: true,
              };
              return updated;
            }
            const currentResult: QuestionResult = {
              sentence: currentSentence,
              userAnswer: '（未回答）',
              aiEvaluation: evaluation,
              initialStatus: 'incorrect',
              finalStatus: 'incorrect',
              finalUserAnswer: '（未回答）',
              finalAiEvaluation: evaluation,
              isNoSpeech: true,
            };
            return [...prev, currentResult];
          });

          setIsAiLoading(false);
          return; // 成功
        } catch (err) {
          console.error(`未回答評価エラー (試行${attempt + 1}/${MAX_NS_RETRIES + 1}):`, err);
          if (attempt < MAX_NS_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }

      // 全リトライ失敗 → リトライボタンを表示
      setIsAiLoading(false);
      setLoadingMessage(null);
      setApiRetryFn(() => () => getNoSpeechEvaluation());
    };

    getNoSpeechEvaluation();
  }, [isNoSpeech, showAnswer, currentSentence.jp, currentSentence.en, currentIndex, partTitle]);

  const handlePlayJapanese = () => {
    setHasUserInteracted(true); // ユーザー操作を記録
    stopJapanese();
    stopEnglish();
    speakJapanese(currentSentence.id, 'ja', undefined, currentSentence.jp).catch(() => {});
  };

  const handleStartRecording = () => {
    if (isListening || isTranscribing) return;
    setHasUserInteracted(true);
    shouldAutoRecordRef.current = false;
    clearSafetyTimeout();
    stopJapanese();
    stopEnglish();
    setHasJudged(false);
    setAiEvaluation(null);
    setSimilarity(null);
    startWhisperRecording(currentSentence?.en);
  };

  const handleStopRecording = () => {
    if (!isListening) return;
    finishRecording();
  };

  const handleJudge = async () => {
    if (!editableText.trim()) return;

    setHasUserInteracted(true);
    shouldAutoRecordRef.current = false;
    clearSafetyTimeout();
    // マイクON中なら中断（文字起こしなしで停止し、現在のテキストで判定）
    whisper.cancelListening();
    setIsListening(false);
    setIsAiLoading(true);
    setHasJudged(true);
    setApiRetryFn(null);

    // リトライ付きAPI呼び出し（最大6回）
    const MAX_RETRIES = 5;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          setLoadingMessage(`サーバー接続中...（リトライ ${attempt}/${MAX_RETRIES}）`);
        }
        const response = await apiFetch('/api/evaluate-speaking', {
          method: 'POST',
          body: JSON.stringify({
            japaneseText: currentSentence.jp,
            correctAnswer: currentSentence.en,
            userAnswer: editableText,
            partTitle,
          }),
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'AI評価に失敗しました');
        }

        setAiEvaluation(data.evaluation);
        setSimilarity(data.evaluation.score);

        // 判定直後に結果を保存（やり直し時も含む）
        const currentIsCorrect = data.evaluation.isCorrect ?? data.evaluation.score >= 70;
        const currentStatus: 'correct' | 'incorrect' = currentIsCorrect ? 'correct' : 'incorrect';

        setQuestionResults((prev) => {
          // 既にこの問題の結果がある場合 → リトライなのでfinalStatusのみ更新
          if (prev.length > currentIndex) {
            const updated = [...prev];
            updated[currentIndex] = {
              ...updated[currentIndex],
              finalStatus: currentStatus,
              finalUserAnswer: editableText,
              finalAiEvaluation: data.evaluation,
            };
            return updated;
          }
          // 初回回答 → initialStatusとfinalStatusの両方を設定
          const currentResult: QuestionResult = {
            sentence: currentSentence,
            userAnswer: editableText,
            aiEvaluation: data.evaluation,
            initialStatus: currentStatus,
            finalStatus: currentStatus,
            finalUserAnswer: editableText,
            finalAiEvaluation: data.evaluation,
            isNoSpeech: false,
          };
          return [...prev, currentResult];
        });

        setIsAiLoading(false);
        setLoadingMessage(null);
        return; // 成功したらここで終了
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('AI評価に失敗しました');
        console.error(`AI評価エラー (試行${attempt + 1}/${MAX_RETRIES + 1}):`, error);
        if (attempt < MAX_RETRIES) {
          // リトライ前に待機（コールドスタート回復を待つ）
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    // 全リトライ失敗 → リトライボタンを表示（フォールバック解説は出さない）
    setIsAiLoading(false);
    setLoadingMessage(null);
    setApiRetryFn(() => () => handleJudge());
  };

  const handleRetry = () => {
    // 前回のタイマーをクリア
    clearSafetyTimeout();
    finishRecording();

    // 状態を完全にリセット
    setRecognizedText('');
    setEditableText('');
    setHasJudged(false);
    setAiEvaluation(null);
    setSimilarity(null);
    setAnswerExampleIndex(0);
    setShowAnswer(false);
    setIsNoSpeech(false);

    // 自動録音フラグをON
    shouldAutoRecordRef.current = true;

    // 日本語を再生し、終了後に自動録音
    const playAndRecord = async () => {
      try {
        await speakJapanese(currentSentence.id, 'ja', undefined, currentSentence.jp);
        setTimeout(() => {
          if (shouldAutoRecordRef.current) {
            startWhisperRecording(currentSentence.en);
          }
        }, 300);
      } catch {
        safetyTimeoutRef.current = setTimeout(() => {
          if (shouldAutoRecordRef.current) {
            startWhisperRecording(currentSentence.en);
          }
        }, 2000);
      }
    };
    playAndRecord();
  };

  const handleShowAnswer = async () => {
    setHasUserInteracted(true); // ユーザー操作を記録
    shouldAutoRecordRef.current = false; // 答えを見るので自動録音を停止
    clearSafetyTimeout(); // Safety Timeoutもクリア
    finishRecording(); // 録音中なら停止
    stopJapanese(); // 日本語音声再生中なら停止
    stopEnglish(); // 英語音声再生中なら停止
    setShowAnswer(true);
    setIsAiLoading(true);
    setHasJudged(true);
    setIsNoSpeech(true);  // 未回答モードとして扱う
    setEditableText('（答えを見る）');

    try {
      const response = await apiFetch('/api/evaluate-speaking', {
        method: 'POST',
        body: JSON.stringify({
          japaneseText: currentSentence.jp,
          correctAnswer: currentSentence.en,
          userAnswer: '（未回答・答えを見る）',
          partTitle,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'AI評価に失敗しました');
      }

      setAiEvaluation(data.evaluation);
      setSimilarity(0);

      // 「答えを見る」の場合は不正解として結果を保存
      setQuestionResults((prev) => {
        // 既にこの問題の結果がある場合 → リトライなのでfinalStatusのみ更新
        if (prev.length > currentIndex) {
          const updated = [...prev];
          updated[currentIndex] = {
            ...updated[currentIndex],
            finalStatus: 'incorrect',
            finalUserAnswer: '（答えを見る）',
            finalAiEvaluation: data.evaluation,
          };
          return updated;
        }
        // 初回 → 不正解として保存
        const currentResult: QuestionResult = {
          sentence: currentSentence,
          userAnswer: '（答えを見る）',
          aiEvaluation: data.evaluation,
          initialStatus: 'incorrect',
          finalStatus: 'incorrect',
          finalUserAnswer: '（答えを見る）',
          finalAiEvaluation: data.evaluation,
          isNoSpeech: true,
        };
        return [...prev, currentResult];
      });
    } catch {
      const fallbackEvaluation = {
        score: 0,
        isCorrect: false,
        meaningCorrect: false,
        grammarCorrect: false,
        feedback: '正解を確認して、声に出して練習してみましょう！',
        correction: currentSentence.en,
        explanation: '',
        encouragement: '声に出して練習することで英語が身につきます！',
        grammarRule: '',
        mistakeAnalysis: '',
      };
      setAiEvaluation(fallbackEvaluation);
      setSimilarity(0);

      // エラー時も結果を保存
      setQuestionResults((prev) => {
        if (prev.length > currentIndex) {
          const updated = [...prev];
          updated[currentIndex] = {
            ...updated[currentIndex],
            finalStatus: 'incorrect',
            finalUserAnswer: '（答えを見る）',
            finalAiEvaluation: fallbackEvaluation,
          };
          return updated;
        }
        const currentResult: QuestionResult = {
          sentence: currentSentence,
          userAnswer: '（答えを見る）',
          aiEvaluation: fallbackEvaluation,
          initialStatus: 'incorrect',
          finalStatus: 'incorrect',
          finalUserAnswer: '（答えを見る）',
          finalAiEvaluation: fallbackEvaluation,
          isNoSpeech: true,
        };
        return [...prev, currentResult];
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleNext = () => {
    stopJapanese();
    stopEnglish();

    // 結果は既にhandleJudge/handleShowAnswerで保存済み
    // ここでは次の問題への移動のみ行う

    if (currentIndex < sentences.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setRecognizedText('');
      setEditableText('');
      setHasJudged(false);
      setAiEvaluation(null);
      setSimilarity(null);
      setAnswerExampleIndex(0);
      setShowAnswer(false);
      setIsNoSpeech(false);
    } else {
      setIsCompleted(true);
      // レッスン完了時に学習記録を保存（問題数を渡す）
      updateStreak(sentences.length);
      // 学習時間を記録（実際の経過時間を計算）
      const elapsedMinutes = startTimeRef.current
        ? Math.max(1, Math.ceil((Date.now() - startTimeRef.current) / 60000))
        : 1;
      recordLearningTime(elapsedMinutes);
      recordSession('スピーキング', sentences.length, { gradeId, partLabel });
      startTimeRef.current = null; // リセット
      // インタースティシャル広告を表示
      showLessonCompleteAd();
      // チュートリアルモードの場合、onCompleteコールバックを呼び出す
      if (onComplete) {
        onComplete();
      }
    }
  };

  const handleReset = () => {
    // 前回のタイマーをクリア
    clearSafetyTimeout();
    finishRecording();

    stopJapanese();
    stopEnglish();
    setCurrentIndex(0);
    setIsCompleted(false);
    setRecognizedText('');
    setEditableText('');
    setHasJudged(false);
    setAiEvaluation(null);
    setSimilarity(null);
    setAnswerExampleIndex(0);
    setShowAnswer(false);
    setIsNoSpeech(false);
    setQuestionResults([]);
    setIsReviewMode(false);
    setExpandedCardIndex(null);
    setHistoryPage(0);

    shouldAutoRecordRef.current = true;

    if (currentIndex === 0) {
      const playAndRecord = async () => {
        try {
          await speakJapanese(sentences[0].id, 'ja', undefined, sentences[0].jp);
          setTimeout(() => {
            if (shouldAutoRecordRef.current) {
              startWhisperRecording(sentences[0].en);
            }
          }, 300);
        } catch {
          safetyTimeoutRef.current = setTimeout(() => {
            if (shouldAutoRecordRef.current) {
              startWhisperRecording(sentences[0].en);
            }
          }, 2000);
        }
      };
      playAndRecord();
    }
  };

  const handlePlayAnswer = () => {
    stopJapanese();
    stopEnglish();
    // ローカル音声はsentenceIdで再生するので、回答例は常にcurrentSentence.idを使用
    speakEnglish(currentSentence.id, 'en', undefined, currentSentence.en).catch(() => {});
  };

  // 回答例の配列を作成（modelAnswersを優先、重複を除去）
  const normalizeText = (text: string) => text.toLowerCase().replace(/[^\w\s]/g, '').trim();
  const modelAnswersList = (() => {
    const baseAnswer = currentSentence.en;
    // modelAnswersがあればそれを使用、なければnaturalExpressionsにフォールバック
    const expressions = aiEvaluation?.modelAnswers || aiEvaluation?.naturalExpressions || [];

    // 正規化したテキストでSetを使って重複除去
    const seen = new Set<string>();
    const unique: string[] = [];

    // まず基本回答を追加
    seen.add(normalizeText(baseAnswer));
    unique.push(baseAnswer);

    // expressionsから重複していないものを追加
    for (const expr of expressions) {
      const normalized = normalizeText(expr);
      if (!seen.has(normalized)) {
        seen.add(normalized);
        unique.push(expr);
      }
    }

    return unique;
  })();

  // 後方互換性のためanswerExamplesも維持
  const answerExamples = modelAnswersList;

  // 復習モード用: 単語をシャッフルする関数
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // 復習モードを開始（初回不正解の問題を抽出 - リトライで正解しても含める）
  const startReviewMode = () => {
    const incorrectResults = questionResults.filter((r) => r.initialStatus === 'incorrect');
    if (incorrectResults.length === 0) return;

    setReviewQuestions(incorrectResults);
    setReviewIndex(0);
    setIsReviewMode(true);
    setIsReviewAnswerShown(false);
    setSelectedWords([]);

    // 最初の問題の単語をシャッフル（最終回答の訂正を使用、「-」は除外）
    const correctAnswer = incorrectResults[0].finalAiEvaluation?.correction || incorrectResults[0].aiEvaluation?.correction || incorrectResults[0].sentence.en;
    const words = correctAnswer.split(/\s+/).filter(w => Boolean(w) && !/^[-–—]+$/.test(w));
    setShuffledWords(shuffleArray(words));
  };

  // 復習モード: 単語を選択
  const handleSelectWord = (word: string, index: number) => {
    if (isReviewAnswerShown) return;
    setSelectedWords((prev) => [...prev, word]);
    setShuffledWords((prev) => prev.filter((_, i) => i !== index));
  };

  // 復習モード: 選択した単語を戻す
  const handleDeselectWord = (word: string, index: number) => {
    if (isReviewAnswerShown) return;
    setShuffledWords((prev) => [...prev, word]);
    setSelectedWords((prev) => prev.filter((_, i) => i !== index));
  };

  // 復習モード: 答え合わせ
  const handleCheckReviewAnswer = () => {
    setIsReviewAnswerShown(true);

    // 正解時のみ英語音声を自動再生（不正解時は▶ボタンで手動再生）
    const currentReviewQuestion = reviewQuestions[reviewIndex];
    const correctAnswer = currentReviewQuestion.aiEvaluation?.correction || currentReviewQuestion.sentence.en;
    const userBuiltSentence = selectedWords.join(' ');
    // レンダー時のisAnswerCorrectと同じ正規化ロジックを使用
    const normalizeTile = (s: string) => s.toLowerCase().split(/\s+/).filter(w => !/^[-\u2013\u2014]+$/.test(w)).join(' ').replace(/[^\w\s]/g, '');
    const isCorrect = normalizeTile(userBuiltSentence) === normalizeTile(correctAnswer);
    if (isCorrect) {
      setTimeout(() => {
        speakEnglish(currentReviewQuestion.sentence.id, 'en', undefined, correctAnswer).catch(() => {});
      }, 600);
    }
  };

  // 復習モード: 次の問題へ
  const handleNextReviewQuestion = () => {
    // 再生中の音声を停止
    stopEnglish();

    if (reviewIndex < reviewQuestions.length - 1) {
      const nextIndex = reviewIndex + 1;
      setReviewIndex(nextIndex);
      setIsReviewAnswerShown(false);
      setSelectedWords([]);

      const correctAnswer = reviewQuestions[nextIndex].aiEvaluation?.correction || reviewQuestions[nextIndex].sentence.en;
      const words = correctAnswer.split(/\s+/).filter(w => Boolean(w) && !/^[-–—]+$/.test(w));
      setShuffledWords(shuffleArray(words));
    } else {
      // 復習完了
      setIsReviewMode(false);
    }
  };

  // 復習モード: 終了
  const exitReviewMode = () => {
    stopEnglish();
    setIsReviewMode(false);
  };

  if (!browserSupported) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-8 text-center max-w-xl">
          <h1 className="text-2xl font-bold text-gray-800 mb-3">スピーキングモード</h1>
          <p className="text-gray-600">このブラウザは音声認識に対応していません。Google Chromeでお試しください。</p>
          <HardNavLink href={backLink} className="inline-block mt-6 text-blue-600 hover:text-blue-800 font-semibold">← 戻る</HardNavLink>
        </div>
      </div>
    );
  }

  if (isCompleted) {
    // チュートリアルモードの場合は親コンポーネントで完了画面を表示
    if (isTutorialMode && onComplete) {
      return null;
    }

    // 成績計算は initialStatus（初回回答）ベース
    const initialCorrectCount = questionResults.filter((r) => r.initialStatus === 'correct').length;
    const initialIncorrectCount = questionResults.filter((r) => r.initialStatus === 'incorrect').length;
    const accuracyRate = Math.round((initialCorrectCount / sentences.length) * 100);

    // 3つの状態をカウント
    // 一発正解: initial=correct, final=correct
    const excellentCount = questionResults.filter((r) => r.initialStatus === 'correct' && r.finalStatus === 'correct').length;
    // リカバリー: initial=incorrect, final=correct
    const recoveredCount = questionResults.filter((r) => r.initialStatus === 'incorrect' && r.finalStatus === 'correct').length;
    // 不正解: initial=incorrect, final=incorrect
    const missedCount = questionResults.filter((r) => r.initialStatus === 'incorrect' && r.finalStatus === 'incorrect').length;

    const getMessage = () => {
      if (accuracyRate === 100) return 'PERFECT!';
      if (accuracyRate >= 80) return 'GREAT!';
      if (accuracyRate >= 60) return 'GOOD!';
      return 'NICE TRY!';
    };

    // 復習モードUI
    if (isReviewMode && reviewQuestions.length > 0) {
      const currentReviewQuestion = reviewQuestions[reviewIndex];
      const correctAnswer = currentReviewQuestion.aiEvaluation?.correction || currentReviewQuestion.sentence.en;
      const userBuiltSentence = selectedWords.join(' ');
      const normalizeTile = (s: string) => s.toLowerCase().split(/\s+/).filter(w => !/^[-–—]+$/.test(w)).join(' ').replace(/[^\w\s]/g, '');
      const isAnswerCorrect = normalizeTile(userBuiltSentence) === normalizeTile(correctAnswer);

      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex justify-center">
          <div className="w-full max-w-[430px] min-h-screen bg-white shadow-xl flex flex-col">
            {/* ヘッダー */}
            <header className="bg-white px-4 py-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <button onClick={exitReviewMode} className="text-gray-600 font-semibold text-sm">
                  ← 結果に戻る
                </button>
                <span className="text-sm font-bold text-indigo-600">復習モード</span>
                <span className="text-gray-500 text-sm">{reviewIndex + 1} / {reviewQuestions.length}</span>
              </div>
            </header>

            {/* メインコンテンツ */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* 問題 */}
              <div className="text-center mb-6">
                <p className="text-sm text-gray-500 mb-2">日本語</p>
                <h1 className="text-2xl font-bold text-gray-800">{currentReviewQuestion.sentence.jp}</h1>
              </div>

              {/* 指示 */}
              <div className="bg-indigo-50 rounded-xl p-3 mb-4 text-center">
                <p className="text-sm text-indigo-700 font-semibold">単語を正しい順番に並べ替えてください</p>
              </div>

              {/* 選択した単語エリア（回答エリア） */}
              <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-4 mb-4 min-h-[80px]">
                <div className="flex flex-wrap gap-2">
                  {selectedWords.length === 0 ? (
                    <p className="text-gray-400 text-sm w-full text-center">ここに単語が並びます</p>
                  ) : (
                    selectedWords.map((word, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleDeselectWord(word, idx)}
                        disabled={isReviewAnswerShown}
                        className={`px-3 py-2 rounded-lg font-semibold transition-all ${
                          isReviewAnswerShown
                            ? 'bg-gray-200 text-gray-600 cursor-default'
                            : 'bg-indigo-500 text-white hover:bg-indigo-600'
                        }`}
                      >
                        {word}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* シャッフルされた単語 */}
              <div className="bg-gray-50 rounded-2xl p-4 mb-6">
                <div className="flex flex-wrap gap-2 justify-center">
                  {shuffledWords.map((word, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectWord(word, idx)}
                      disabled={isReviewAnswerShown}
                      className={`px-3 py-2 rounded-lg font-semibold transition-all ${
                        isReviewAnswerShown
                          ? 'bg-gray-300 text-gray-500 cursor-default'
                          : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-indigo-400 hover:bg-indigo-50'
                      }`}
                    >
                      {word}
                    </button>
                  ))}
                </div>
              </div>

              {/* 答え合わせ結果 */}
              {isReviewAnswerShown && (
                <div className="space-y-3 mb-4">
                  {/* ユーザーの回答 */}
                  <div className={`rounded-xl p-4 ${isAnswerCorrect ? 'bg-green-50 border border-green-300' : 'bg-orange-50 border border-orange-300'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-lg ${isAnswerCorrect ? '' : ''}`}>{isAnswerCorrect ? '⭕' : '❌'}</span>
                      <span className={`text-xs font-bold ${isAnswerCorrect ? 'text-green-600' : 'text-orange-600'}`}>
                        あなたの回答
                      </span>
                    </div>
                    <p className="text-gray-800 font-semibold">{userBuiltSentence || '（未回答）'}</p>
                  </div>

                  {/* 正解 */}
                  {!isAnswerCorrect && (
                    <div className="bg-green-50 border border-green-300 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs text-green-600 font-bold">正解</span>
                          <p className="text-gray-800 font-semibold mt-1">{correctAnswer}</p>
                        </div>
                        <button
                          onClick={() => { stopEnglish(); speakEnglish(currentReviewQuestion.sentence.id, 'en', undefined, correctAnswer).catch(() => {}); }}
                          disabled={isPlayingEnglish}
                          className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 disabled:opacity-50 transition-all"
                        >
                          <PlayIcon />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ボタン */}
              <div className="flex gap-3">
                {!isReviewAnswerShown ? (
                  <button
                    onClick={handleCheckReviewAnswer}
                    disabled={selectedWords.length === 0}
                    className="flex-1 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-xl hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 transition-all"
                  >
                    答え合わせ
                  </button>
                ) : (
                  <button
                    onClick={handleNextReviewQuestion}
                    className="flex-1 py-3 bg-gradient-to-r from-green-400 to-green-500 text-white font-bold rounded-xl hover:from-green-500 hover:to-green-600 transition-all"
                  >
                    {reviewIndex < reviewQuestions.length - 1 ? '次へ →' : '復習完了'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // 初回不正解の問題数（リカバリー+不正解）
    const incorrectCount = initialIncorrectCount;
    const partSelectHref = partSelectLink || backLink;

    return (
      <div className="min-h-screen bg-[#F4F2F8] flex justify-center">
        {/* モバイルコンテナ - 紙吹雪とテキストの範囲を制限 */}
        <div className="relative w-full max-w-[430px] h-screen overflow-hidden shadow-xl">
          {/* Confetti演出 - コンテナ内に制限 */}
          <ConfettiCelebration
            show={true}
            message={getMessage()}
            subMessage={accuracyRate >= 80 ? '素晴らしい成績です！' : undefined}
            showText={false}
          />

          {/* スクロール可能なコンテンツエリア */}
          <div className="h-full overflow-y-auto pb-8">
            <ResultHeader
              message={getMessage()}
              subMessage={accuracyRate >= 80 ? '素晴らしい成績です！' : undefined}
            />

            <div className="px-4">
            {/* マスコットコメント */}
            <div className="max-w-md w-full mx-auto mb-4">
              <MascotComment accuracyRate={accuracyRate} />
            </div>

            {/* 結果カード */}
            <div className="max-w-md w-full mx-auto bg-white rounded-2xl shadow-lg p-6 relative z-10 mb-4 border border-gray-100">
              {/* スコア表示 */}
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 mb-3 shadow-lg">
                  <span className="text-3xl font-black text-white">{accuracyRate}%</span>
                </div>
                <h1 className="text-xl font-bold text-gray-800 mb-1">トレーニング完了！</h1>
                <p className="text-gray-600 text-sm">
                  {sentences.length}問中 <span className="font-bold text-green-600">{initialCorrectCount}問</span> 正解（初回）
                </p>
              </div>

              {/* 統計 - 3状態表示 */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-green-600">{excellentCount}</p>
                  <p className="text-xs text-gray-500">一発正解</p>
                </div>
                <div className="bg-yellow-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-yellow-600">{recoveredCount}</p>
                  <p className="text-xs text-gray-500">リカバリー</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-red-600">{missedCount}</p>
                  <p className="text-xs text-gray-500">不正解</p>
                </div>
              </div>

              {/* 復習ボタン（不正解がある場合のみ表示） */}
              {incorrectCount > 0 && (
                <button
                  onClick={startReviewMode}
                  className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg mb-3"
                >
                  🔄 間違えた問題を復習する（{incorrectCount}問）
                </button>
              )}

              {/* ボタン */}
              <div className="flex flex-col">
                {/* 1. Primary: 次のレッスン */}
                {nextLessonLink ? (
                  <a
                    href={nextLessonLink}
                    className="flex items-center justify-center gap-2 w-full bg-blue-500 text-white font-bold py-4 rounded-xl active:scale-[0.98] transition-transform text-base"
                  >
                    次のレッスン
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg>
                  </a>
                ) : (
                  <a
                    href={partSelectHref}
                    className="flex items-center justify-center gap-2 w-full bg-blue-500 text-white font-bold py-4 rounded-xl active:scale-[0.98] transition-transform text-base"
                  >
                    {partSelectLink ? 'Part選択に戻る' : '戻る'}
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg>
                  </a>
                )}

                {/* 2. Secondary: もう一度 */}
                <button
                  onClick={handleReset}
                  className="flex items-center justify-center gap-2 w-full mt-3 bg-white border-2 border-blue-400 text-blue-600 font-bold py-4 rounded-xl active:scale-[0.98] transition-transform text-base"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35A7.96 7.96 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" /></svg>
                  もう一度
                </button>

                {/* 3. Tertiary: テキストリンク */}
                <div className="flex items-center justify-around mt-6">
                  <a
                    href={partSelectHref}
                    className="text-xs text-gray-400 font-semibold active:text-gray-600 transition-colors"
                  >
                    ← Part選択
                  </a>
                  <HardNavLink
                    href="/home"
                    className="text-xs text-gray-400 font-semibold active:text-gray-600 transition-colors"
                  >
                    ホームに戻る
                  </HardNavLink>
                </div>
              </div>
            </div>

            {/* 履歴リストセクション */}
            {questionResults.length > 0 && (
              <div className="max-w-md w-full mx-auto bg-white rounded-2xl shadow-lg p-4 relative z-10 border border-gray-100">
                <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span>📝</span> 今回の回答履歴
                </h2>

                {historyPageCount > 1 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {Array.from({ length: historyPageCount }, (_, page) => {
                      const start = page * historyPageSize + 1;
                      const end = Math.min(questionResults.length, (page + 1) * historyPageSize);
                      const isActive = page === safeHistoryPage;
                      return (
                        <button
                          key={page}
                          type="button"
                          onClick={() => {
                            setHistoryPage(page);
                            setExpandedCardIndex(null);
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-bold border ${
                            isActive
                              ? 'bg-blue-500 text-white border-blue-500'
                              : 'bg-white text-gray-600 border-gray-200'
                          }`}
                        >
                          {start}-{end}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="space-y-3">
                  {pagedQuestionResults.map((result, index) => {
                    const globalIndex = historyStartIndex + index;
                    const isExpanded = expandedCardIndex === globalIndex;
                    // 最終回答の差分表示に変更
                    const displayAnswer = result.finalUserAnswer || result.userAnswer;
                    const displayEvaluation = result.finalAiEvaluation || result.aiEvaluation;
                    const resultWordDiff = displayAnswer && displayEvaluation && !result.isNoSpeech
                      ? getWordDiff(displayAnswer, displayEvaluation.correctedUserAnswer || displayEvaluation.correction || result.sentence.en)
                      : null;

                    // 3状態の判定
                    const isExcellent = result.initialStatus === 'correct' && result.finalStatus === 'correct';
                    const isRecovered = result.initialStatus === 'incorrect' && result.finalStatus === 'correct';
                    const isMissed = result.initialStatus === 'incorrect' && result.finalStatus === 'incorrect';

                    // スタイル設定
                    const cardStyle = isExcellent
                      ? 'border-green-200 bg-green-50'
                      : isRecovered
                      ? 'border-yellow-200 bg-yellow-50'
                      : 'border-red-200 bg-red-50';

                    const badgeStyle = isExcellent
                      ? 'bg-green-500'
                      : isRecovered
                      ? 'bg-yellow-500'
                      : 'bg-red-500';

                    const statusLabel = isExcellent ? '一発正解' : isRecovered ? 'リカバリー' : '不正解';

                    return (
                      <div
                        key={globalIndex}
                        className={`rounded-xl border-2 overflow-hidden transition-all ${cardStyle}`}
                      >
                        {/* カードヘッダー（タップで展開） */}
                        <button
                          onClick={() => setExpandedCardIndex(isExpanded ? null : globalIndex)}
                          className="w-full p-3 flex items-center justify-between text-left"
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 min-w-[1.5rem] min-h-[1.5rem] flex-shrink-0 rounded-full flex items-center justify-center text-white font-bold ${badgeStyle}`}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                {isExcellent ? (
                                  <circle cx="12" cy="12" r="9" />
                                ) : isRecovered ? (
                                  <polygon points="12,3 22,21 2,21" />
                                ) : (
                                  <><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></>
                                )}
                              </svg>
                            </span>
                            <span className="text-gray-800 font-semibold text-sm line-clamp-1">
                              {result.sentence.jp}
                            </span>
                          </div>
                          <span className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                            ▼
                          </span>
                        </button>

                        {/* 展開コンテンツ */}
                        {isExpanded && (
                          <div className="px-3 pb-3 space-y-2">
                            {/* リカバリーの場合は初回回答と最終回答の両方を表示 */}
                            {isRecovered && (
                              <div className="bg-yellow-100 rounded-lg p-2 text-xs text-yellow-700 mb-2">
                                💡 初回は不正解でしたが、リトライで正解しました
                              </div>
                            )}

                            {/* 初回回答（リカバリー時のみ表示） */}
                            {isRecovered && (
                              <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-orange-600 font-bold">初回回答（不正解）</span>
                                  {result.userAnswer && result.userAnswer !== '（未回答）' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        stopEnglish();
                                        speakEnglish(result.sentence.id, 'en', undefined, result.userAnswer).catch(() => {});
                                      }}
                                      disabled={isPlayingEnglish}
                                      className="w-7 h-7 bg-orange-200 text-orange-600 rounded-full flex items-center justify-center hover:bg-orange-300 disabled:opacity-50 text-xs"
                                    >
                                      <PlayIcon />
                                    </button>
                                  )}
                                </div>
                                <p className="text-gray-700 text-sm">{result.userAnswer || '（未回答）'}</p>
                              </div>
                            )}

                            {/* 最終回答 */}
                            <div className="bg-white rounded-lg p-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-gray-500 font-bold">
                                  {isRecovered ? '最終回答（正解）' : 'あなたの回答'}
                                </span>
                                {displayAnswer && !result.isNoSpeech && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      stopEnglish();
                                      speakEnglish(result.sentence.id, 'en', undefined, displayAnswer).catch(() => {});
                                    }}
                                    disabled={isPlayingEnglish}
                                    className="w-7 h-7 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center hover:bg-gray-300 disabled:opacity-50 text-xs"
                                  >
                                    <PlayIcon />
                                  </button>
                                )}
                              </div>
                              {result.isNoSpeech && !isRecovered ? (
                                <p className="text-gray-400 text-sm">（未回答）</p>
                              ) : resultWordDiff ? (
                                <p className="text-sm">
                                  {resultWordDiff.userDiff.map((item, idx) => (
                                    <span
                                      key={idx}
                                      className={item.type === 'wrong' ? 'text-orange-600 bg-orange-200 px-0.5 rounded' : 'text-gray-700'}
                                    >
                                      {item.word}{idx < resultWordDiff.userDiff.length - 1 ? ' ' : ''}
                                    </span>
                                  ))}
                                </p>
                              ) : (
                                <p className="text-gray-700 text-sm">{displayAnswer}</p>
                              )}
                            </div>

                            {/* 正解 / 訂正後 */}
                            <div className="bg-white rounded-lg p-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-green-600 font-bold">
                                  {isExcellent || isRecovered ? '正解' : '訂正後'}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    stopEnglish();
                                    const textToSpeak = displayEvaluation?.correctedUserAnswer || displayEvaluation?.correction || result.sentence.en;
                                    speakEnglish(result.sentence.id, 'en', undefined, textToSpeak).catch(() => {});
                                  }}
                                  disabled={isPlayingEnglish}
                                  className="w-7 h-7 bg-green-100 text-green-600 rounded-full flex items-center justify-center hover:bg-green-200 disabled:opacity-50 text-xs"
                                >
                                  <PlayIcon />
                                </button>
                              </div>
                              {resultWordDiff && !isExcellent ? (
                                <p className="text-sm font-semibold">
                                  {resultWordDiff.correctionDiff.map((item, idx) => (
                                    <span
                                      key={idx}
                                      className={item.type === 'added' ? 'text-teal-600 bg-teal-200 px-0.5 rounded' : 'text-gray-800'}
                                    >
                                      {item.word}{idx < resultWordDiff.correctionDiff.length - 1 ? ' ' : ''}
                                    </span>
                                  ))}
                                </p>
                              ) : (
                                <p className="text-gray-800 text-sm font-semibold">
                                  {displayEvaluation?.correctedUserAnswer || displayEvaluation?.correction || result.sentence.en}
                                </p>
                              )}
                            </div>

                            {/* 別の言い方（modelAnswers） */}
                            {displayEvaluation?.modelAnswers && displayEvaluation.modelAnswers.length > 1 && (
                              <div className="bg-blue-50 rounded-lg p-3">
                                <span className="text-xs text-blue-600 font-bold mb-1 block">別の言い方</span>
                                <ul className="space-y-1">
                                  {displayEvaluation.modelAnswers.slice(1).map((answer, i) => (
                                    <li key={i} className="flex items-center justify-between">
                                      <span className="text-gray-700 text-sm">• {answer}</span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          stopEnglish();
                                          const sid = answer === result.sentence.en ? result.sentence.id : `tts-${Date.now()}`;
                                          speakEnglish(sid, 'en', undefined, answer).catch(() => {});
                                        }}
                                        disabled={isPlayingEnglish}
                                        className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center hover:bg-blue-200 disabled:opacity-50 text-xs"
                                      >
                                        <PlayIcon />
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* 解説（間違えた箇所）- 最終不正解の場合のみ表示 */}
                            {displayEvaluation?.mistakeAnalysis && !isExcellent && !isRecovered && (
                              <div className="bg-orange-100 rounded-lg p-3">
                                <span className="text-xs text-orange-600 font-bold mb-1 block">❗ 間違えた箇所</span>
                                <p className="text-gray-700 text-xs">{displayEvaluation.mistakeAnalysis}</p>
                              </div>
                            )}

                            {/* 文法ルール - 最終不正解の場合のみ表示 */}
                            {displayEvaluation?.grammarRule && !isExcellent && !isRecovered && (
                              <div className="bg-purple-100 rounded-lg p-3">
                                <span className="text-xs text-purple-600 font-bold mb-1 block">📚 文法ルール</span>
                                <p className="text-gray-700 text-xs">{displayEvaluation.grammarRule}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 訂正対象: correctedUserAnswer（最小限の修正）を優先、なければcorrection
  const correctionTarget = hasJudged && aiEvaluation
    ? (aiEvaluation.correctedUserAnswer || aiEvaluation.correction || currentSentence.en)
    : currentSentence.en;

  const wordDiff = hasJudged && aiEvaluation && !isNoSpeech
    ? getWordDiff(editableText, correctionTarget)
    : { userDiff: [], correctionDiff: [] };

  // pageTitleまたはpartIdからPartラベルを抽出
  const formatHeaderTitle = (title?: string, currentPartId?: string) => {
    const partMatch = currentPartId?.match(/-p(\d+)/i);
    const partLabelFromId = partMatch ? `Part ${partMatch[1]}` : null;
    if (!title) return { partLabel: partLabelFromId };
    const match = title.match(/Part\s*\d+/i);
    return { partLabel: partLabelFromId || (match ? match[0] : null) };
  };
  const headerTitle = formatHeaderTitle(pageTitle, partId);
  const badgeClass = getLessonPartBadgeClassName();

  return (
    <div className="min-h-screen bg-gray-200 flex justify-center">
      <div className="w-full max-w-[430px] min-h-screen bg-white shadow-xl flex flex-col relative">
        {/* ヘッダー */}
        <header className="bg-white px-4 py-3 sticky top-0 z-30 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <HardNavLink href={backLink} className="text-gray-600 font-semibold text-sm min-w-[50px]">← 戻る</HardNavLink>
            <div className="text-center flex-1 px-2">
              {headerTitle.partLabel && (
                <span className={badgeClass}>
                  {headerTitle.partLabel}
                </span>
              )}
            </div>
            <span className="min-w-[50px]" />
          </div>
        </header>

        {/* メインコンテンツ */}
        <div className="flex-1 overflow-y-auto p-4">

        {/* 進捗バー */}
        <div className="mb-4 space-y-1">
          <div className="text-center text-xs font-semibold text-gray-500 tabular-nums">
            {currentIndex + 1} / {sentences.length}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / sentences.length) * 100}%` }}
            />
          </div>
        </div>

        {/* 問題 */}
        <div className="text-center mb-6">
          <p className="text-sm text-gray-500 mb-2">問題</p>
          <h1 className="text-3xl font-bold text-gray-800">{currentSentence.jp}</h1>
        </div>

        {/* 日本語を聞くボタン */}
        <button
          onClick={handlePlayJapanese}
          disabled={isPlayingJapanese}
          className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 py-4 px-8 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold rounded-full mb-8 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 transition-all shadow-lg"
        >
          <SpeakerIcon size={20} />
          <span>{isPlayingJapanese ? '再生中...' : '日本語を聞く'}</span>
        </button>

        {/* 回答セクション */}
        <div className="bg-gradient-to-b from-blue-50 to-green-50 rounded-3xl shadow-lg p-8 mb-4">
          <h2 className="text-center font-bold text-gray-700 mb-6">回答</h2>

          {/* 回答入力エリア */}
          {!hasJudged && !showAnswer && (
            <div className="flex flex-col items-center">
              {/* テキスト入力欄 + 送信ボタン（常時表示） */}
              {!isAiLoading && (
                <div className="w-full mb-4">
                  <div className="flex gap-2 items-stretch">
                    <textarea
                      value={editableText}
                      onChange={(e) => setEditableText(e.target.value)}
                      placeholder={isListening ? '聞き取り中...' : isTranscribing ? '文字起こし中...' : 'ここに英文を入力または音声入力...'}
                      className="flex-1 p-3 border-2 border-blue-200 rounded-xl focus:outline-none focus:border-blue-400 resize-none text-gray-800"
                      rows={2}
                    />
                    <button
                      onClick={handleJudge}
                      disabled={!editableText.trim() || isAiLoading}
                      className="px-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 transition-all flex items-center justify-center"
                      title="判定する"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-7-7l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* マイクボタン */}
              <button
                onClick={isListening ? handleStopRecording : handleStartRecording}
                disabled={isAiLoading}
                className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all transform hover:scale-105 ${
                  isListening
                    ? 'bg-red-500 animate-pulse'
                    : isAiLoading
                    ? 'bg-gray-400'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                <div className={`w-14 h-14 rounded-full border-3 border-white/30 flex items-center justify-center ${
                  isListening ? 'bg-red-600' : isAiLoading ? 'bg-gray-500' : 'bg-red-600'
                }`}>
                  {isListening ? (
                    <div className="flex items-center justify-center gap-[3px]">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="w-[3px] bg-white rounded-full"
                          style={{
                            animation: 'soundWave 1s ease-in-out infinite',
                            animationDelay: `${i * 0.15}s`,
                            height: '8px',
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="w-3.5 h-3.5 bg-white rounded-full" />
                  )}
                </div>
              </button>

              <p className="text-gray-500 mt-2 text-xs">
                {isListening ? '聞き取り中...' : 'タップして録音'}
              </p>

              {/* わからない・答えを見るボタン */}
              <button
                onClick={handleShowAnswer}
                className="mt-4 px-6 py-2 border-2 border-blue-400 text-blue-500 font-semibold rounded-full hover:bg-blue-50 transition-all"
              >
                わからない・答えを見る
              </button>
            </div>
          )}

          {/* 答えを見るモード */}
          {showAnswer && !hasJudged && (
            <div className="text-center">
              <div className="bg-white rounded-2xl p-6 mb-4">
                <h3 className="font-bold text-gray-700 mb-2">正解</h3>
                <p className="text-xl text-gray-800 font-semibold">{currentSentence.en}</p>
                <button
                  onClick={() => {
                    stopEnglish();
                    speakEnglish(currentSentence.id, 'en', undefined, currentSentence.en).catch(() => {});
                  }}
                  disabled={isPlayingEnglish}
                  className="mt-3 px-4 py-2 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 disabled:opacity-50 transition-all"
                >
                  {isPlayingEnglish ? '再生中...' : <><PlayIcon size={14} className="inline-block align-middle mr-1" />発音を聞く</>}
                </button>
              </div>
              {!isAiLoading && (
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleRetry}
                    className="px-6 py-3 border-2 border-blue-500 text-blue-500 font-bold rounded-xl hover:bg-blue-50 transition-all"
                  >
                    やり直す
                  </button>
                  <button
                    onClick={handleNext}
                    className="px-6 py-3 bg-gradient-to-r from-green-400 to-green-500 text-white font-bold rounded-xl hover:from-green-500 hover:to-green-600 transition-all"
                  >
                    次へ →
                  </button>
                </div>
              )}
            </div>
          )}

          {recognitionError && (
            <p className="text-sm text-red-500 mt-4 text-center">{recognitionError}</p>
          )}
        </div>

        {/* ローディング中の表示 */}
        {isAiLoading && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-4">
            <div className="flex flex-col items-center justify-center">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
              <p className="text-lg font-bold text-gray-700">{loadingMessage || '判定中...'}</p>
              <p className="text-sm text-gray-500 mt-2">{loadingMessage ? 'しばらくお待ちください' : 'AIがあなたの回答を評価しています'}</p>
            </div>
          </div>
        )}

        {/* 通信エラー時のリトライボタン */}
        {apiRetryFn && !isAiLoading && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-4">
            <div className="flex flex-col items-center justify-center">
              <p className="text-lg font-bold text-red-600 mb-2">通信エラー</p>
              <p className="text-sm text-gray-500 mb-4">サーバーに接続できませんでした</p>
              <button
                onClick={() => { const fn = apiRetryFn; setApiRetryFn(null); fn(); }}
                className="px-6 py-3 bg-blue-500 text-white rounded-xl font-bold text-lg shadow-md hover:bg-blue-600 active:bg-blue-700 transition-colors"
              >
                再試行
              </button>
            </div>
          </div>
        )}

        {/* 判定結果 */}
        {hasJudged && aiEvaluation && !isAiLoading && !apiRetryFn && (
          <>
            {/* 回答例カルーセル */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-lg p-4 mb-3 border border-blue-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📚</span>
                  <span className="text-sm font-bold text-blue-700">回答例</span>
                  {modelAnswersList.length > 1 && (
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                      {answerExampleIndex + 1} / {modelAnswersList.length}
                    </span>
                  )}
                </div>
                {/* ドットインジケーター */}
                <div className="flex items-center gap-1.5">
                  {modelAnswersList.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setAnswerExampleIndex(i)}
                      className={`w-2.5 h-2.5 rounded-full transition-all ${
                        i === answerExampleIndex
                          ? 'bg-blue-500 scale-110'
                          : 'bg-gray-300 hover:bg-gray-400'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* カルーセル本体 */}
              <div className="relative overflow-hidden">
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    {/* 左矢印 */}
                    {modelAnswersList.length > 1 && (
                      <button
                        onClick={() => setAnswerExampleIndex((prev) => Math.max(0, prev - 1))}
                        disabled={answerExampleIndex === 0}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-500 disabled:opacity-20 transition-all"
                      >
                        ‹
                      </button>
                    )}

                    {/* 回答テキスト */}
                    <div className="flex-1 text-center">
                      <p className="text-gray-800 font-bold text-lg leading-relaxed">
                        {modelAnswersList[answerExampleIndex]}
                      </p>
                      {answerExampleIndex === 0 && modelAnswersList.length > 1 && (
                        <span className="inline-block mt-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                          基本形
                        </span>
                      )}
                      {answerExampleIndex > 0 && (
                        <span className="inline-block mt-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          別の言い方
                        </span>
                      )}
                    </div>

                    {/* 右矢印 */}
                    {modelAnswersList.length > 1 && (
                      <button
                        onClick={() => setAnswerExampleIndex((prev) => Math.min(modelAnswersList.length - 1, prev + 1))}
                        disabled={answerExampleIndex === modelAnswersList.length - 1}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-500 disabled:opacity-20 transition-all"
                      >
                        ›
                      </button>
                    )}
                  </div>

                  {/* 再生ボタン - 現在表示中の回答例を読み上げ */}
                  <div className="mt-3 flex justify-center">
                    <button
                      onClick={() => {
                        stopTTS();
                        stopEnglish();
                        // 現在表示中のスライドのテキストを読み上げ
                        const text = modelAnswersList[answerExampleIndex];
                        // 元の文と同じならMP3を再生、異なればTTSフォールバック用に存在しないIDを使用
                        const sentenceId = text === currentSentence.en ? currentSentence.id : `tts-${Date.now()}`;
                        speakEnglish(sentenceId, 'en', undefined, text).catch(() => {});
                      }}
                      disabled={isTTSSpeaking || isPlayingEnglish}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 transition-all text-sm font-semibold"
                    >
                      <span>{isPlayingEnglish ? <SpeakerIcon /> : <PlayIcon size={14} />}</span>
                      <span>{isPlayingEnglish ? '再生中...' : '発音を聞く'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* スワイプヒント */}
              {modelAnswersList.length > 1 && (
                <p className="text-center text-xs text-gray-400 mt-2">
                  ← → で他の言い方を見る
                </p>
              )}
            </div>

            {/* 未回答モードの場合：解き方解説 */}
            {isNoSpeech ? (
              <>
                {/* 未回答ラベル */}
                <div className="bg-gray-100 rounded-2xl p-4 mb-3 text-center">
                  <span className="text-gray-500 font-bold">未回答</span>
                  <p className="text-sm text-gray-600 mt-1">
                    {aiEvaluation.feedback || '声に出して練習してみましょう！'}
                  </p>
                </div>

                {/* 正解 */}
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-3">
                  <span className="text-xs text-green-600 font-bold">正解</span>
                  <p className="mt-1 text-gray-800 font-bold text-lg">{aiEvaluation.correction || currentSentence.en}</p>
                </div>

                {/* 英語の型 */}
                {aiEvaluation.patternJa && (
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-3">
                    <span className="text-xs text-blue-600 font-bold">📐 英語の型（パターン）</span>
                    <p className="mt-1 text-gray-700 text-sm">{aiEvaluation.patternJa}</p>
                  </div>
                )}

                {/* 日本語→英語の対応 */}
                {aiEvaluation.breakdownJa && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 mb-3">
                    <span className="text-xs text-indigo-600 font-bold">🔗 日本語→英語の対応</span>
                    <p className="mt-1 text-gray-700 text-sm">{aiEvaluation.breakdownJa}</p>
                  </div>
                )}

                {/* 覚えるポイント */}
                {aiEvaluation.keyPointJa && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-3">
                    <span className="text-xs text-yellow-600 font-bold">💡 覚えるポイント</span>
                    <p className="mt-1 text-gray-700 text-sm">{aiEvaluation.keyPointJa}</p>
                  </div>
                )}

                {/* 他の言い方 */}
                {aiEvaluation.naturalExpressions && aiEvaluation.naturalExpressions.length > 1 && (
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-3">
                    <span className="text-xs text-green-600 font-bold">✨ 他の言い方</span>
                    <ul className="mt-1 space-y-1">
                      {aiEvaluation.naturalExpressions.filter(expr => expr !== currentSentence.en).map((expr, i) => (
                        <li key={i} className="text-gray-700 text-sm">• {expr}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {!hasNoSpeechExplanation && aiEvaluation.feedback && (
                  <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 mb-3">
                    <span className="text-xs text-purple-600 font-bold">💡 解説</span>
                    <p className="mt-1 text-gray-700 text-sm">{aiEvaluation.feedback}</p>
                  </div>
                )}

                {/* 励ましの言葉 */}
                {aiEvaluation.encouragement && (
                  <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-3 text-center">
                    <p className="text-orange-700 font-semibold">{aiEvaluation.encouragement}</p>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* 回答ありの場合：判定結果UI */}
                {/* 判定結果バー */}
                <div className="bg-white rounded-2xl shadow-lg p-4 mb-3">
                  <span className="text-xs text-gray-500">判定結果</span>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all bg-gradient-to-r from-orange-400 via-yellow-400 to-teal-400"
                        style={{ width: `${similarity || 0}%` }}
                      />
                    </div>
                    <span className="text-lg font-bold text-gray-800">{similarity || 0}%</span>
                  </div>
                </div>

                {/* あなたの回答（オレンジ枠・差分ハイライト付き） */}
                <div className="bg-orange-50 border border-orange-300 rounded-2xl p-4 mb-3">
                  <span className="text-xs text-orange-600 font-bold">あなたの回答</span>
                  <p className="mt-2 text-lg">
                    {wordDiff.userDiff.length > 0 ? (
                      wordDiff.userDiff.map((item, idx) => (
                        <span
                          key={idx}
                          className={`${
                            item.type === 'wrong'
                              ? 'text-orange-600 bg-orange-200 px-1 rounded'
                              : 'text-gray-700'
                          }`}
                        >
                          {item.word}{idx < wordDiff.userDiff.length - 1 ? ' ' : ''}
                        </span>
                      ))
                    ) : (
                      <span className="text-orange-700">{editableText || '（未入力）'}</span>
                    )}
                  </p>
                </div>

                {/* 下矢印と訂正後：100点未満の場合のみ表示 */}
                {(similarity || 0) < 100 && (
                  <>
                    {/* 下矢印 */}
                    <div className="flex justify-center my-2">
                      <span className="text-gray-400 text-2xl">▼</span>
                    </div>

                    {/* 訂正後（緑枠・差分ハイライト付き・再生ボタン付き） */}
                    <div className="bg-green-50 border border-green-300 rounded-2xl p-4 mb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-green-600 font-bold">訂正後</span>
                            {aiEvaluation.correctedUserAnswer && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                あなたの表現を活かした修正
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-lg font-semibold">
                            {wordDiff.correctionDiff.length > 0 ? (
                              wordDiff.correctionDiff.map((item, idx) => (
                                <span
                                  key={idx}
                                  className={`${
                                    item.type === 'added'
                                      ? 'text-teal-600 bg-teal-200 px-1 rounded'
                                      : 'text-gray-800'
                                  }`}
                                >
                                  {item.word}{idx < wordDiff.correctionDiff.length - 1 ? ' ' : ''}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-800">{correctionTarget}</span>
                            )}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            stopEnglish();
                            speakEnglish(currentSentence.id, 'en', undefined, correctionTarget).catch(() => {});
                          }}
                          disabled={isPlayingEnglish}
                          className="ml-3 w-10 h-10 bg-teal-500 text-white rounded-full flex items-center justify-center hover:bg-teal-600 disabled:opacity-50 transition-all flex-shrink-0"
                        >
                          <PlayIcon />
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* 間違えた箇所（オレンジ枠・100%の時は非表示） */}
                {aiEvaluation.mistakeAnalysis && (similarity || 0) < 100 && (
                  <div className="bg-orange-50 border border-orange-300 rounded-2xl p-4 mb-3">
                    <span className="text-xs text-orange-600 font-bold">❗ 間違えた箇所</span>
                    <p className="mt-1 text-gray-700 text-sm">{aiEvaluation.mistakeAnalysis}</p>
                  </div>
                )}

                {/* 文法ルール（紫枠・100%の時は非表示） */}
                {aiEvaluation.grammarRule && (similarity || 0) < 100 && (
                  <div className="bg-purple-50 border border-purple-300 rounded-2xl p-4 mb-3">
                    <span className="text-xs text-purple-600 font-bold">📚 文法ルール</span>
                    <p className="mt-1 text-gray-700 text-sm">{aiEvaluation.grammarRule}</p>
                  </div>
                )}

                {/* ニュアンスの違い（緑枠・100%の時は非表示） */}
                {aiEvaluation.nuanceDifference && (similarity || 0) < 100 && (
                  <div className="bg-green-50 border border-green-300 rounded-2xl p-4 mb-3">
                    <span className="text-xs text-green-600 font-bold">💡 ニュアンスの違い</span>
                    <p className="mt-1 text-gray-700 text-sm">{aiEvaluation.nuanceDifference}</p>
                  </div>
                )}

                {/* フィードバック（黒枠） */}
                {aiEvaluation.feedback && (
                  <div className="bg-gray-50 border border-gray-300 rounded-2xl p-4 mb-3">
                    <span className="text-xs text-gray-700 font-bold">フィードバック</span>
                    <p className="mt-1 text-gray-700 text-sm">{aiEvaluation.feedback}</p>
                  </div>
                )}
                {!hasAnswerExplanation && (
                  <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 mb-3">
                    <span className="text-xs text-purple-600 font-bold">💡 解説</span>
                    <p className="mt-1 text-gray-700 text-sm">解説が取得できませんでした。時間を置いてもう一度お試しください。</p>
                  </div>
                )}
              </>
            )}

            {/* やり直す・次へボタン */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleRetry}
                className="flex-1 py-3 bg-white border-2 border-blue-500 text-blue-500 font-bold rounded-2xl hover:bg-blue-50 transition-all"
              >
                やり直す ↺
              </button>
              <button
                onClick={handleNext}
                className="flex-1 py-3 bg-gradient-to-r from-green-400 to-green-500 text-white font-bold rounded-2xl hover:from-green-500 hover:to-green-600 transition-all"
              >
                次へ →
              </button>
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
}
