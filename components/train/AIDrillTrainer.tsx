'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import HardNavLink from '@/components/HardNavLink';
import { apiFetch } from '@/utils/api';
import { useServerTTS } from '@/hooks/useServerTTS';
import { updateStreak } from '@/utils/streak';
import { recordLearningTime } from '@/utils/learningTime';
import { recordSession } from '@/utils/sessionLog';
import ConfettiCelebration from '@/components/ConfettiCelebration';
import MascotComment from '@/components/MascotComment';
import ResultHeader from './ResultHeader';
import type { Sentence } from '@/types/sentence';
import type { AIDrillSession, AIDrillQuestion, AIDrillPhase } from '@/types/aiDrill';
import { getLessonPartBadgeClassName } from '@/utils/gradeTheme';

interface AIDrillTrainerProps {
  partSentences: Sentence[];
  partId: string;
  partTitle: string;
  grammarTags: string[];
  backLink: string;
  partSelectLink?: string;
  nextLessonLink?: string;
  gradeId?: string;
  partLabel?: string;
  onComplete?: () => void;
}

interface AIEvaluation {
  score: number;
  isCorrect: boolean;
  meaningCorrect: boolean;
  grammarCorrect: boolean;
  feedback: string;
  correction: string;
  correctedUserAnswer?: string;
  explanation: string;
  encouragement: string;
  modelAnswers?: string[];
  naturalExpressions?: string[];
  grammarRule?: string;
  nuanceDifference?: string;
  mistakeAnalysis?: string;
  patternJa?: string;
  breakdownJa?: string;
  keyPointJa?: string;
}

interface QuestionResult {
  questionJa: string;
  correctEn: string;
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

const TOTAL_QUESTIONS = 10;

interface WordDiffResult {
  userDiff: { word: string; type: 'correct' | 'wrong' | 'missing' }[];
  correctionDiff: { word: string; type: 'correct' | 'added' }[];
}

function getWordDiff(userText: string, correctText: string): WordDiffResult {
  // "-"のみのトークンは除外（音声入力では"-"が反映されないため）
  const tokenize = (text: string) => text.split(/\s+/).filter(t => Boolean(t) && !/^[-–—]+$/.test(t));
  const normalizeWord = (word: string) => word.toLowerCase().replace(/[^\w]/g, '');

  const userWords = tokenize(userText);
  const correctWords = tokenize(correctText);

  const userNormalized = userWords.map(normalizeWord);
  const correctNormalized = correctWords.map(normalizeWord);

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

  const userDiff = userWords.map((word, idx) => ({
    word,
    type: userMatched.has(idx) ? 'correct' as const : 'wrong' as const,
  }));

  const correctionDiff = correctWords.map((word, idx) => ({
    word,
    type: correctMatched.has(idx) ? 'correct' as const : 'added' as const,
  }));

  return { userDiff, correctionDiff };
}

// 単語をシャッフルする関数
function shuffleWords(text: string): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const shuffled = [...words];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function AIDrillTrainer({
  partSentences,
  partId,
  partTitle,
  grammarTags,
  backLink,
  partSelectLink,
  nextLessonLink,
  gradeId,
  partLabel,
  onComplete,
}: AIDrillTrainerProps) {
  const [session, setSession] = useState<AIDrillSession>({
    totalQuestions: TOTAL_QUESTIONS,
    currentIndex: 0,
    history: [],
    partId,
    partTitle,
    grammarTags,
  });

  const [phase, setPhase] = useState<AIDrillPhase>('loading');
  const [currentQuestion, setCurrentQuestion] = useState<{ questionJa: string; expectedEn: string } | null>(null);
  const [userInput, setUserInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [judgeResult, setJudgeResult] = useState<{ isCorrect: boolean; correctEn: string; explanation: string } | null>(null);
  const [aiEvaluation, setAiEvaluation] = useState<AIEvaluation | null>(null);
  const [similarity, setSimilarity] = useState<number | null>(null);
  const [answerExampleIndex, setAnswerExampleIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showReviewMode, setShowReviewMode] = useState(false);
  const [reviewQuestions, setReviewQuestions] = useState<AIDrillQuestion[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isNoSpeech, setIsNoSpeech] = useState(false);
  const [browserSupported, setBrowserSupported] = useState(true);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [editableText, setEditableText] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [questionResults, setQuestionResults] = useState<QuestionResult[]>([]);
  const [expandedCardIndex, setExpandedCardIndex] = useState<number | null>(null);
  const [historyPage, setHistoryPage] = useState(0);
  const serverTTS = useServerTTS();
  const isTTSSpeaking = serverTTS.isSpeaking;
  const [questionsQueue, setQuestionsQueue] = useState<{ questionJa: string; expectedEn: string }[]>([]);

  const historyPageSize = 10;
  const historyPageCount = Math.ceil(questionResults.length / historyPageSize);
  const safeHistoryPage = Math.min(historyPage, Math.max(0, historyPageCount - 1));
  const historyStartIndex = safeHistoryPage * historyPageSize;
  const pagedQuestionResults = questionResults.slice(
    historyStartIndex,
    historyStartIndex + historyPageSize
  );

  // タイル並べ替え用のstate
  const [shuffledTiles, setShuffledTiles] = useState<string[]>([]);
  const [selectedTiles, setSelectedTiles] = useState<string[]>([]);
  const [tileCorrect, setTileCorrect] = useState<boolean | null>(null);

  const recognitionRef = useRef<any>(null);
  const startTimeRef = useRef<number>(Date.now()); // 学習開始時刻
  const intentionalStopRef = useRef(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const gracePeriodActiveRef = useRef(false);
  const accumulatedTextRef = useRef('');
  const currentSessionTextRef = useRef('');
  const autoRestartCountRef = useRef(0);
  const questionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initializedRef = useRef(false);
  // phaseを同期的に参照するためのref（タイマーコールバック内で使用）
  const phaseRef = useRef<AIDrillPhase>('loading');
  // API呼び出しの排他制御
  const evaluatingRef = useRef(false);
  // evaluateNoSpeech用のAbortController
  const evaluateAbortRef = useRef<AbortController | null>(null);

  // serverTTSの関数をrefで保持（依存チェーン防止）
  const serverTTSSpeakRef = useRef(serverTTS.speak);
  const serverTTSStopRef = useRef(serverTTS.stop);
  useEffect(() => {
    serverTTSSpeakRef.current = serverTTS.speak;
    serverTTSStopRef.current = serverTTS.stop;
  }, [serverTTS.speak, serverTTS.stop]);

  // phase変更時にrefも同期
  const setPhaseWithRef = useCallback((newPhase: AIDrillPhase) => {
    phaseRef.current = newPhase;
    setPhase(newPhase);
  }, []);

  // サーバーTTS APIで日本語を読み上げ（refを使い依存を安定化）
  const speakJapanese = useCallback((text: string) => {
    serverTTSSpeakRef.current(text, 'ja-JP');
  }, []);

  // サーバーTTS APIで英語を読み上げ（refを使い依存を安定化）
  const speakEnglish = useCallback((text: string) => {
    serverTTSSpeakRef.current(text, 'en-US');
  }, []);

  // 任意のテキストをTTSで読み上げ（完了画面の再生ボタン用）
  const speakText = (text: string, lang: string = 'en-US') => {
    serverTTSSpeakRef.current(text, lang);
  };

  // ランダムにサンプル文を取得
  const getRandomSamples = useCallback((count: number = 4) => {
    const shuffled = [...partSentences].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length)).map(s => ({
      jp: s.jp,
      en: s.en,
    }));
  }, [partSentences]);

  // 無音タイマーをクリア
  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  // 録音を意図的に終了
  const finishRecording = () => {
    intentionalStopRef.current = true;
    clearSilenceTimer();
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    setIsListening(false);
  };

  // 蓄積テキストをリセット
  const resetRecognitionRefs = () => {
    intentionalStopRef.current = false;
    accumulatedTextRef.current = '';
    currentSessionTextRef.current = '';
    autoRestartCountRef.current = 0;
    clearSilenceTimer();
  };

  // 音声認識の初期化
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setBrowserSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setRecognitionError(null);
      currentSessionTextRef.current = '';
      autoRestartCountRef.current = 0;
      gracePeriodActiveRef.current = true;
      setTimeout(() => {
        gracePeriodActiveRef.current = false;
      }, 2500);
    };

    recognition.onresult = (event: any) => {
      autoRestartCountRef.current = 0;

      let sessionTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        sessionTranscript += event.results[i][0].transcript;
      }
      currentSessionTextRef.current = sessionTranscript;

      const fullText = (accumulatedTextRef.current + sessionTranscript).trim();
      if (fullText) {
        setUserInput(fullText);
        setEditableText(fullText);
      }

      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      silenceTimerRef.current = setTimeout(() => {
        intentionalStopRef.current = true;
        try { recognitionRef.current?.stop(); } catch { /* ignore */ }
      }, 1500);
    };

    recognition.onerror = (event: any) => {
      const err = String(event?.error || 'unknown');
      if (err === 'no-speech') {
        if (!gracePeriodActiveRef.current) {
          setIsNoSpeech(true);
          intentionalStopRef.current = true;
          setIsListening(false);
          try { recognitionRef.current?.stop(); } catch { /* ignore */ }
        }
      } else if (err === 'not-allowed' || err === 'service-not-allowed') {
        setRecognitionError('マイクの許可が必要です（ブラウザの権限設定を確認してください）。');
        intentionalStopRef.current = true;
        setIsListening(false);
      } else if (err === 'aborted') {
        // 再起動時のabortedエラーは無視
      } else {
        setRecognitionError(`音声認識エラー: ${err}`);
        intentionalStopRef.current = true;
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      if (!intentionalStopRef.current && autoRestartCountRef.current < 3) {
        const sessionText = currentSessionTextRef.current.trim();
        if (sessionText) {
          accumulatedTextRef.current = (accumulatedTextRef.current + sessionText).trim() + ' ';
        }
        currentSessionTextRef.current = '';
        autoRestartCountRef.current++;
        try {
          recognitionRef.current?.start();
        } catch {
          setIsListening(false);
        }
      } else {
        setIsListening(false);
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        if (autoRestartCountRef.current >= 3 && !accumulatedTextRef.current.trim() && !currentSessionTextRef.current.trim()) {
          setIsNoSpeech(true);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      intentionalStopRef.current = true;
      try { recognition.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };
  }, []);

  // startQuestion内のタイマーをクリア
  const clearQuestionTimers = useCallback(() => {
    if (questionTimerRef.current) {
      clearTimeout(questionTimerRef.current);
      questionTimerRef.current = null;
    }
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  const startQuestion = useCallback((question: { questionJa: string; expectedEn: string }) => {
    // 前回のタイマーをクリア
    clearQuestionTimers();
    // 進行中の評価をキャンセル
    if (evaluateAbortRef.current) {
      evaluateAbortRef.current.abort();
      evaluateAbortRef.current = null;
    }
    evaluatingRef.current = false;

    setError(null);
    setJudgeResult(null);
    setAiEvaluation(null);
    setSimilarity(null);
    setAnswerExampleIndex(0);
    setUserInput('');
    setEditableText('');
    setShowAnswer(false);
    setIsNoSpeech(false);
    setIsAiLoading(false);
    setCurrentQuestion(question);
    setPhaseWithRef('question');

    questionTimerRef.current = setTimeout(() => {
      // タイマー発火時にphaseが変わっていたら何もしない
      if (phaseRef.current !== 'question') return;
      speakJapanese(question.questionJa);
      recordingTimerRef.current = setTimeout(() => {
        // 録音開始時もphaseを確認
        if (phaseRef.current !== 'question') return;
        if (recognitionRef.current) {
          resetRecognitionRefs();
          try {
            recognitionRef.current.start();
          } catch { /* ignore */ }
        }
      }, 2000);
    }, 500);
  }, [speakJapanese, clearQuestionTimers]);

  const initializeDrill = useCallback(async () => {
    setPhaseWithRef('loading');
    setError(null);
    setJudgeResult(null);
    setAiEvaluation(null);
    setSimilarity(null);
    setAnswerExampleIndex(0);
    setUserInput('');
    setEditableText('');
    setShowAnswer(false);
    setIsNoSpeech(false);

    try {
      const samples = getRandomSamples(4);
      const response = await apiFetch('/api/ai-drill/generate', {
        method: 'POST',
        body: JSON.stringify({
          part_title: partTitle,
          samples,
          grammarTags,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || '問題生成に失敗しました');
      }

      const questions = Array.isArray(data) ? data : data.questions;

      if (!questions || questions.length === 0) {
        throw new Error(data.error || '問題生成に失敗しました');
      }

      const normalizedQuestions = questions.map((q: { japanese: string; english: string }) => ({
        questionJa: q.japanese,
        expectedEn: q.english,
      }));

      setQuestionsQueue(normalizedQuestions);
      setSession(prev => ({
        ...prev,
        totalQuestions: normalizedQuestions.length || TOTAL_QUESTIONS,
        currentIndex: 0,
        history: [],
      }));
      startTimeRef.current = Date.now();
      startQuestion(normalizedQuestions[0]);
    } catch (err) {
      console.error('問題生成エラー:', err);
      setError(err instanceof Error ? err.message : '問題生成に失敗しました');
      setPhaseWithRef('question');
    }
  }, [getRandomSamples, partTitle, grammarTags, startQuestion]);

  // 初回問題生成（一度だけ実行）
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    initializeDrill();

    return () => {
      clearQuestionTimers();
      // コンポーネントアンマウント時に全てのAPI呼び出しをキャンセル
      if (evaluateAbortRef.current) {
        evaluateAbortRef.current.abort();
        evaluateAbortRef.current = null;
      }
      evaluatingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 無音時の自動処理
  useEffect(() => {
    if (!isNoSpeech || showAnswer) return;
    setShowAnswer(true);
    setEditableText('（未回答）');
  }, [isNoSpeech, showAnswer]);

  // 未回答時のAI評価（スピーキング評価API）
  // useEffectのクリーンアップ競合を防ぐため、排他制御付きで実装
  useEffect(() => {
    if (!isNoSpeech || !currentQuestion) return;
    // 既に評価中なら重複呼び出しをスキップ
    if (evaluatingRef.current) return;
    evaluatingRef.current = true;

    // 前回のリクエストをキャンセル
    if (evaluateAbortRef.current) {
      evaluateAbortRef.current.abort();
    }
    const abortController = new AbortController();
    evaluateAbortRef.current = abortController;

    const evaluateNoSpeech = async () => {
      setIsAiLoading(true);
      setAiEvaluation(null);
      setSimilarity(0);
      setError(null);

      let evaluation: AIEvaluation = {
        score: 0,
        isCorrect: false,
        meaningCorrect: false,
        grammarCorrect: false,
        feedback: '回答がありませんでした。正解を確認して、声に出して練習してみましょう！',
        correction: currentQuestion.expectedEn,
        explanation: '',
        encouragement: '次は声に出してチャレンジしてみましょう！',
        grammarRule: '',
        mistakeAnalysis: '',
      };

      try {
        const response = await apiFetch('/api/evaluate-speaking', {
          method: 'POST',
          body: JSON.stringify({
            japaneseText: currentQuestion.questionJa,
            correctAnswer: currentQuestion.expectedEn,
            userAnswer: '（未回答・無音）',
            partTitle,
          }),
          signal: abortController.signal,
        });

        if (abortController.signal.aborted) return;

        const data = await response.json();

        if (abortController.signal.aborted) return;

        if (!data.success) {
          if (data.error && String(data.error).includes('リクエスト制限')) {
            evaluation = {
              score: 0,
              isCorrect: false,
              meaningCorrect: false,
              grammarCorrect: false,
              feedback: 'リクエスト制限に達しました。少し待ってから再度お試しください。',
              correction: currentQuestion.expectedEn,
              explanation: '',
              encouragement: '少し時間を置いてからもう一度試してみましょう！',
              grammarRule: '',
              mistakeAnalysis: '',
            };
          } else {
            throw new Error(data.error || '判定に失敗しました');
          }
        } else {
          evaluation = data.evaluation;
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.error('未回答判定エラー:', err);
      }

      if (abortController.signal.aborted) return;

      setAiEvaluation(evaluation);
      setSimilarity(0);

      // 未回答時も結果を保存
      setQuestionResults(prev => {
        // 既にこの問題の結果がある場合 → リトライなのでfinalStatusのみ更新
        if (prev.length > session.currentIndex) {
          const updated = [...prev];
          updated[session.currentIndex] = {
            ...updated[session.currentIndex],
            finalStatus: 'incorrect',
            finalUserAnswer: '（未回答）',
            finalAiEvaluation: evaluation,
            isNoSpeech: true,
          };
          return updated;
        }
        // 初回 → 不正解として保存
        const currentResult: QuestionResult = {
          questionJa: currentQuestion.questionJa,
          correctEn: evaluation.correction || currentQuestion.expectedEn,
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
      evaluatingRef.current = false;
    };

    evaluateNoSpeech();

    return () => {
      abortController.abort();
      evaluatingRef.current = false;
    };
  }, [isNoSpeech, currentQuestion, partTitle]);

  const handleStartRecording = () => {
    if (!recognitionRef.current || isListening) return;
    serverTTSStopRef.current();
    setRecognitionError(null);
    setShowAnswer(false);
    setIsNoSpeech(false);
    clearSilenceTimer();
    resetRecognitionRefs();
    try {
      recognitionRef.current.start();
    } catch {
      setRecognitionError('音声認識を開始できませんでした。ページを再読み込みしてお試しください。');
    }
  };

  const handleStopRecording = () => {
    if (!recognitionRef.current || !isListening) return;
    finishRecording();
  };

  // 回答判定（スピーキング評価APIを使用）
  const judgeAnswer = async (answer: string) => {
    if (!currentQuestion) return;

    setPhaseWithRef('judging');
    setIsAiLoading(true);
    setError(null);
    setAiEvaluation(null);
    setSimilarity(null);

    try {
      const response = await apiFetch('/api/evaluate-speaking', {
        method: 'POST',
        body: JSON.stringify({
          japaneseText: currentQuestion.questionJa,
          correctAnswer: currentQuestion.expectedEn,
          userAnswer: answer,
          partTitle,
        }),
      });

      const data = await response.json();

        if (!data.success) {
          if (data.error && String(data.error).includes('リクエスト制限')) {
            setAiEvaluation({
              score: 0,
              isCorrect: false,
              meaningCorrect: false,
              grammarCorrect: false,
              feedback: 'リクエスト制限に達しました。少し待ってから再度お試しください。',
              correction: currentQuestion.expectedEn,
              explanation: '',
              encouragement: '少し時間を置いてからもう一度試してみましょう！',
              grammarRule: '',
              mistakeAnalysis: '',
            });
            setSimilarity(0);
            setPhaseWithRef('result');
            return;
          }
          throw new Error(data.error || '判定に失敗しました');
        }

      const evaluation: AIEvaluation = data.evaluation;
      const isCorrect = evaluation?.isCorrect ?? (evaluation?.score ?? 0) >= 70;
      const correctEn = evaluation?.correction || currentQuestion.expectedEn;
      const explanation = evaluation?.grammarRule || evaluation?.mistakeAnalysis || evaluation?.feedback || '';

      const result = {
        isCorrect,
        correctEn,
        explanation,
      };

      setJudgeResult(result);
      setAiEvaluation(evaluation);
      setSimilarity(evaluation?.score ?? 0);
      setAnswerExampleIndex(0);

      const newQuestion: AIDrillQuestion = {
        id: `q${session.currentIndex + 1}`,
        questionJa: currentQuestion.questionJa,
        correctEn,
        userAnswerEn: answer,
        isCorrect,
        explanation,
      };

      setSession(prev => ({
        ...prev,
        history: [...prev.history, newQuestion],
      }));

      // 判定直後に結果を保存（やり直し時も含む）
      const currentStatus: 'correct' | 'incorrect' = isCorrect ? 'correct' : 'incorrect';
      setQuestionResults(prev => {
        // 既にこの問題の結果がある場合 → リトライなのでfinalStatusのみ更新
        if (prev.length > session.currentIndex) {
          const updated = [...prev];
          updated[session.currentIndex] = {
            ...updated[session.currentIndex],
            finalStatus: currentStatus,
            finalUserAnswer: answer,
            finalAiEvaluation: evaluation,
          };
          return updated;
        }
        // 初回回答 → initialStatusとfinalStatusの両方を設定
        const currentResult: QuestionResult = {
          questionJa: currentQuestion.questionJa,
          correctEn,
          userAnswer: answer,
          aiEvaluation: evaluation,
          initialStatus: currentStatus,
          finalStatus: currentStatus,
          finalUserAnswer: answer,
          finalAiEvaluation: evaluation,
          isNoSpeech: false,
        };
        return [...prev, currentResult];
      });

      setPhaseWithRef('result');
    } catch (err) {
      console.error('判定エラー:', err);
      setError(err instanceof Error ? err.message : '判定に失敗しました');
      setPhaseWithRef('question');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleJudge = async () => {
    if (!editableText.trim()) return;
    await judgeAnswer(editableText.trim());
  };

  const handleShowAnswer = () => {
    finishRecording();
    clearQuestionTimers();
    // 進行中の評価をリセット
    evaluatingRef.current = false;
    if (evaluateAbortRef.current) {
      evaluateAbortRef.current.abort();
      evaluateAbortRef.current = null;
    }
    setShowAnswer(true);
    setIsNoSpeech(true);
    setEditableText('（答えを見る）');
    setAiEvaluation(null);
    setSimilarity(null);
    setAnswerExampleIndex(0);
  };

  const handleRetry = () => {
    clearQuestionTimers();
    // 進行中の評価をリセット
    evaluatingRef.current = false;
    if (evaluateAbortRef.current) {
      evaluateAbortRef.current.abort();
      evaluateAbortRef.current = null;
    }
    setUserInput('');
    setEditableText('');
    setShowAnswer(false);
    setIsNoSpeech(false);
    setIsAiLoading(false);
    setJudgeResult(null);
    setAiEvaluation(null);
    setSimilarity(null);
    setAnswerExampleIndex(0);
    setRecognitionError(null);
    clearSilenceTimer();
    setPhaseWithRef('question');

    if (currentQuestion) {
      questionTimerRef.current = setTimeout(() => {
        if (phaseRef.current !== 'question') return;
        speakJapanese(currentQuestion.questionJa);
        recordingTimerRef.current = setTimeout(() => {
          if (phaseRef.current !== 'question') return;
          if (recognitionRef.current) {
            resetRecognitionRefs();
            try {
              recognitionRef.current.start();
            } catch { /* ignore */ }
          }
        }, 2000);
      }, 500);
    }
  };

  // 次の問題へ
  const handleNext = () => {
    serverTTSStopRef.current();
    clearQuestionTimers();
    const nextIndex = session.currentIndex + 1;
    const totalQuestions = questionsQueue.length || TOTAL_QUESTIONS;

    // 結果は既にjudgeAnswer/useEffectで保存済み
    // ここでは次の問題への移動のみ行う

    if (nextIndex >= totalQuestions) {
      setPhaseWithRef('finished');
      // レッスン完了時に学習記録を保存
      updateStreak(totalQuestions);
      // 学習時間を記録（実際の経過時間を計算）
      const elapsedMinutes = Math.max(1, Math.ceil((Date.now() - startTimeRef.current) / 60000));
      recordLearningTime(elapsedMinutes);
      recordSession('AI応用ドリル', totalQuestions, { gradeId, partLabel });
      onComplete?.();
    } else {
      setSession(prev => ({ ...prev, currentIndex: nextIndex }));
      const nextQuestion = questionsQueue[nextIndex];
      if (nextQuestion) {
        startQuestion(nextQuestion);
      }
    }
  };

  // 答えを見るモードから次へ
  const handleNextFromShowAnswer = () => {
    // 結果は既にuseEffectで保存済み
    if (currentQuestion) {
      const newQuestion: AIDrillQuestion = {
        id: `q${session.currentIndex + 1}`,
        questionJa: currentQuestion.questionJa,
        correctEn: currentQuestion.expectedEn,
        userAnswerEn: '（未回答）',
        isCorrect: false,
        explanation: '',
      };

      setSession(prev => ({
        ...prev,
        history: [...prev.history, newQuestion],
      }));
    }

    handleNext();
  };

  const handleReset = () => {
    serverTTSStopRef.current();
    clearQuestionTimers();
    // 進行中の評価をキャンセル
    evaluatingRef.current = false;
    if (evaluateAbortRef.current) {
      evaluateAbortRef.current.abort();
      evaluateAbortRef.current = null;
    }
    setSession({
      totalQuestions: TOTAL_QUESTIONS,
      currentIndex: 0,
      history: [],
      partId,
      partTitle,
      grammarTags,
    });
    setPhaseWithRef('loading');
    setCurrentQuestion(null);
    setJudgeResult(null);
    setAiEvaluation(null);
    setSimilarity(null);
    setUserInput('');
    setEditableText('');
    setShowAnswer(false);
    setIsNoSpeech(false);
    setIsAiLoading(false);
    setRecognitionError(null);
    setShowReviewMode(false);
    setReviewQuestions([]);
    setReviewIndex(0);
    setShuffledTiles([]);
    setSelectedTiles([]);
    setTileCorrect(null);
    setQuestionResults([]);
    setExpandedCardIndex(null);
    setHistoryPage(0);
    startTimeRef.current = Date.now();
    // initializedRefをリセットしてから再初期化
    initializedRef.current = false;
    initializeDrill();
  };

  // 復習モード開始（タイル並べ替えクイズ）- 初回不正解の問題を抽出
  const startReview = () => {
    // questionResultsからinitialStatusが'incorrect'の問題を抽出
    const incorrectResults = questionResults.filter(r => r.initialStatus === 'incorrect');
    // AIDrillQuestion形式に変換
    const incorrectQuestions = incorrectResults.map((r, idx) => ({
      id: `q${idx + 1}`,
      questionJa: r.questionJa,
      correctEn: r.finalAiEvaluation?.correction || r.aiEvaluation?.correction || r.correctEn,
      userAnswerEn: r.finalUserAnswer || r.userAnswer,
      isCorrect: r.finalStatus === 'correct',
      explanation: r.finalAiEvaluation?.feedback || r.aiEvaluation?.feedback || '',
    }));

    if (incorrectQuestions.length > 0) {
      setReviewQuestions(incorrectQuestions);
      setReviewIndex(0);
      setShowReviewMode(true);
      setTileCorrect(null);

      // 最初の問題のタイルをシャッフル
      const firstQuestion = incorrectQuestions[0];
      setShuffledTiles(shuffleWords(firstQuestion.correctEn));
      setSelectedTiles([]);
    }
  };

  // タイルをタップして選択
  const handleTileSelect = (word: string, index: number) => {
    // 選択済みタイルから該当の単語を探す
    const availableTiles = shuffledTiles.filter((_, i) => {
      const selectedCount = selectedTiles.filter((t, si) => {
        // selectedTilesの中で、このindexより前にある同じ単語の数をカウント
        return shuffledTiles.indexOf(t) === i || shuffledTiles.slice(0, i).filter(st => st === t).length < selectedTiles.slice(0, si + 1).filter(st => st === t).length;
      }).length;
      return selectedCount === 0 || shuffledTiles.filter(t => t === shuffledTiles[i]).length > selectedCount;
    });

    // 実際にはシンプルに追加
    setSelectedTiles(prev => [...prev, word]);

    // 使用済みタイルを更新（同じ単語が複数ある場合のためにindexを使用）
    const newShuffled = [...shuffledTiles];
    newShuffled.splice(index, 1);
    setShuffledTiles(newShuffled);
  };

  // 選択したタイルを戻す
  const handleTileDeselect = (word: string, index: number) => {
    const newSelected = [...selectedTiles];
    newSelected.splice(index, 1);
    setSelectedTiles(newSelected);
    setShuffledTiles(prev => [...prev, word]);
  };

  // タイル並べ替えの回答をチェック
  const checkTileAnswer = () => {
    const currentReviewQuestion = reviewQuestions[reviewIndex];
    const userAnswer = selectedTiles.join(' ');
    const correctAnswer = currentReviewQuestion.correctEn;

    // 大文字小文字を無視して比較
    const isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase();
    setTileCorrect(isCorrect);

    // 正解の場合は英語音声を再生
    if (isCorrect) {
      setTimeout(() => {
        speakEnglish(correctAnswer);
      }, 500);
    }
  };

  // 復習モードの次の問題
  const handleReviewNext = () => {
    if (reviewIndex + 1 >= reviewQuestions.length) {
      setShowReviewMode(false);
      setPhaseWithRef('finished');
    } else {
      const nextIndex = reviewIndex + 1;
      setReviewIndex(nextIndex);
      setTileCorrect(null);

      // 次の問題のタイルをシャッフル
      const nextQuestion = reviewQuestions[nextIndex];
      setShuffledTiles(shuffleWords(nextQuestion.correctEn));
      setSelectedTiles([]);
    }
  };

  // 復習問題をやり直す
  const handleReviewRetry = () => {
    const currentReviewQuestion = reviewQuestions[reviewIndex];
    setShuffledTiles(shuffleWords(currentReviewQuestion.correctEn));
    setSelectedTiles([]);
    setTileCorrect(null);
  };

  // ヘッダータイトル整形
  const formatHeaderTitle = (title: string, currentPartId?: string) => {
    const partMatch = currentPartId?.match(/-p(\d+)/i);
    const partLabelFromId = partMatch ? `Part ${partMatch[1]}` : null;
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

  const headerTitle = formatHeaderTitle(partTitle, partId);
  const badgeClass = getLessonPartBadgeClassName();
  const incorrectCount = session.history.filter(q => !q.isCorrect).length;
  const renderInMobileFrame = (content: React.ReactNode) => (
    <div className="min-h-screen bg-gray-100 flex justify-center">
      <main className="w-full max-w-md bg-white min-h-screen shadow-xl relative overflow-hidden flex flex-col">
        {content}
      </main>
    </div>
  );

  // ブラウザ非対応
  if (!browserSupported) {
    return renderInMobileFrame(
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-3">AI応用ドリル</h1>
          <p className="text-gray-600">このブラウザは音声認識に対応していません。Google Chromeでお試しください。</p>
          <HardNavLink href={backLink} className="inline-block mt-6 text-blue-600 hover:text-blue-800 font-semibold">← 戻る</HardNavLink>
        </div>
      </div>
    );
  }

  // 完了画面
  if (phase === 'finished' && !showReviewMode) {
    const totalAnswered = questionResults.length;
    // 成績計算は initialStatus（初回回答）ベース
    const initialCorrectCount = questionResults.filter(r => r.initialStatus === 'correct').length;
    const initialIncorrectCount = questionResults.filter(r => r.initialStatus === 'incorrect').length;
    const accuracyRate = totalAnswered > 0 ? Math.round((initialCorrectCount / totalAnswered) * 100) : 0;

    // 3つの状態をカウント
    const excellentCount = questionResults.filter(r => r.initialStatus === 'correct' && r.finalStatus === 'correct').length;
    const recoveredCount = questionResults.filter(r => r.initialStatus === 'incorrect' && r.finalStatus === 'correct').length;
    const missedCount = questionResults.filter(r => r.initialStatus === 'incorrect' && r.finalStatus === 'incorrect').length;

    const partSelectHref = partSelectLink || backLink;

    const getMessage = () => {
      if (accuracyRate === 100) return 'PERFECT!';
      if (accuracyRate >= 80) return 'GREAT!';
      if (accuracyRate >= 60) return 'GOOD!';
      return 'NICE TRY!';
    };

    return (
      <div className="min-h-screen bg-[#F4F2F8] flex justify-center">
        <div className="relative w-full max-w-[430px] h-screen overflow-hidden shadow-xl">
          <ConfettiCelebration
            show={true}
            message={getMessage()}
            subMessage={accuracyRate >= 80 ? '素晴らしい成績です！' : undefined}
            showText={false}
          />

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

            <div className="max-w-md w-full mx-auto bg-white rounded-2xl shadow-lg p-6 relative z-10 mb-4 border border-gray-100">
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 mb-3 shadow-lg">
                  <span className="text-3xl font-black text-white">{accuracyRate}%</span>
                </div>
                <h1 className="text-xl font-bold text-gray-800 mb-1">AI応用ドリル完了！</h1>
                <p className="text-gray-600 text-sm">
                  {totalAnswered}問中 <span className="font-bold text-green-600">{initialCorrectCount}問</span> 正解（初回）
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

              {initialIncorrectCount > 0 && (
                <button
                  onClick={startReview}
                  className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg mb-3"
                >
                  🔄 間違えた問題を復習する（{initialIncorrectCount}問）
                </button>
              )}

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
                      ? getWordDiff(displayAnswer, displayEvaluation.correctedUserAnswer || displayEvaluation.correction || result.correctEn)
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

                      const badgeIcon = isExcellent ? '🟢' : isRecovered ? '🟡' : '🔴';
                      const statusLabel = isExcellent ? '一発正解' : isRecovered ? 'リカバリー' : '不正解';
                      const badgeSymbol = isExcellent ? '○' : isRecovered ? '△' : '×';
                      const badgeSizeClass = isExcellent ? 'text-3xl leading-none' : isRecovered ? 'text-sm leading-none' : 'text-xl leading-none';
                      const circleOffsetY = -1;
                      const triangleOffsetY = 0;
                      const crossOffsetY = -1;
                      const badgeSymbolOffsetStyle = isExcellent
                        ? { transform: `translateY(${circleOffsetY}px)` }
                        : isRecovered
                        ? { transform: `translateY(${triangleOffsetY}px)` }
                        : { transform: `translateY(${crossOffsetY}px)` };

                    return (
                      <div
                        key={`${result.questionJa}-${globalIndex}`}
                        className={`rounded-xl border-2 overflow-hidden transition-all ${cardStyle}`}
                      >
                        <button
                          onClick={() => setExpandedCardIndex(isExpanded ? null : globalIndex)}
                          className="w-full p-3 flex items-center justify-between text-left"
                        >
                          <div className="flex items-center gap-2">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold ${badgeStyle}`}>
                                <span style={badgeSymbolOffsetStyle} className={badgeSizeClass}>
                                  {badgeSymbol}
                                </span>
                              </span>
                            <span className="text-gray-800 font-semibold text-sm line-clamp-1">
                              Q{index + 1}. {result.questionJa}
                            </span>
                          </div>
                          <span className="text-gray-400 text-sm">{isExpanded ? '▲' : '▼'}</span>
                        </button>

                        {isExpanded && (
                          <div className="px-3 pb-3 space-y-3">
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
                                        speakText(result.userAnswer, 'en-US');
                                      }}
                                      disabled={isTTSSpeaking}
                                      className="w-7 h-7 bg-orange-200 text-orange-600 rounded-full flex items-center justify-center hover:bg-orange-300 disabled:opacity-50 text-xs"
                                    >
                                      ▶
                                    </button>
                                  )}
                                </div>
                                <p className="text-gray-700 text-sm">{result.userAnswer || '（未回答）'}</p>
                              </div>
                            )}

                            <div className="bg-white rounded-xl p-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-gray-500">
                                  {isRecovered ? '最終回答（正解）' : 'あなたの回答'}
                                </span>
                                {displayAnswer && !result.isNoSpeech && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      speakText(displayAnswer, 'en-US');
                                    }}
                                    disabled={isTTSSpeaking}
                                    className="w-7 h-7 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center hover:bg-gray-300 disabled:opacity-50 text-xs"
                                  >
                                    ▶
                                  </button>
                                )}
                              </div>
                              <p className="text-sm text-gray-800">
                                {result.isNoSpeech && !isRecovered ? (
                                  '（未回答）'
                                ) : resultWordDiff ? (
                                  resultWordDiff.userDiff.map((item, idx) => (
                                    <span
                                      key={idx}
                                      className={`${
                                        item.type === 'wrong'
                                          ? 'text-orange-600 bg-orange-200 px-1 rounded'
                                          : 'text-gray-700'
                                      }`}
                                    >
                                      {item.word}{idx < resultWordDiff.userDiff.length - 1 ? ' ' : ''}
                                    </span>
                                  ))
                                ) : (
                                  displayAnswer || '（未回答）'
                                )}
                              </p>
                            </div>
                            <div className="bg-white rounded-xl p-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-gray-500">
                                  {isExcellent || isRecovered ? '正解' : '訂正後'}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const textToSpeak = displayEvaluation?.correctedUserAnswer || displayEvaluation?.correction || result.correctEn;
                                    speakText(textToSpeak, 'en-US');
                                  }}
                                  disabled={isTTSSpeaking}
                                  className="w-7 h-7 bg-green-100 text-green-600 rounded-full flex items-center justify-center hover:bg-green-200 disabled:opacity-50 text-xs"
                                >
                                  ▶
                                </button>
                              </div>
                              <p className="text-sm text-green-700 font-semibold">
                                {displayEvaluation?.correction || result.correctEn}
                              </p>
                            </div>
                            {displayEvaluation?.modelAnswers && displayEvaluation.modelAnswers.length > 1 && (
                              <div className="bg-blue-50 rounded-xl p-3">
                                <span className="text-xs text-blue-600 font-bold mb-1 block">別の言い方</span>
                                <ul className="space-y-1">
                                  {displayEvaluation.modelAnswers.slice(1).map((answer, i) => (
                                    <li key={i} className="flex items-center justify-between">
                                      <span className="text-gray-700 text-sm">• {answer}</span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          speakText(answer, 'en-US');
                                        }}
                                        disabled={isTTSSpeaking}
                                        className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center hover:bg-blue-200 disabled:opacity-50 text-xs"
                                      >
                                        ▶
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {displayEvaluation?.feedback && !isExcellent && !isRecovered && (
                              <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                                <p className="text-xs text-gray-700 font-bold mb-1">フィードバック</p>
                                <p className="text-sm text-gray-700">{displayEvaluation.feedback}</p>
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

  // 復習モード（タイル並べ替えクイズ）
  if (showReviewMode) {
    const currentReviewQuestion = reviewQuestions[reviewIndex];

    return renderInMobileFrame(
      <>
        {/* ヘッダー */}
        <header className="relative z-10 px-4 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setShowReviewMode(false);
                setPhaseWithRef('finished');
              }}
              className="inline-flex items-center gap-2 whitespace-nowrap shrink-0 text-blue-700 hover:text-blue-900 font-semibold bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-sm border border-white/60"
            >
              <span aria-hidden>←</span>
              <span className="leading-none">戻る</span>
            </button>

            <div className="text-right">
              <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-bold">
                {reviewIndex + 1}/{reviewQuestions.length}
              </span>
            </div>
          </div>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            {headerTitle.partLabel && (
              <div className="mb-1">
                <span className={badgeClass}>
                  {headerTitle.partLabel}
                </span>
              </div>
            )}
            <h1 className="text-xl font-black text-gray-900">
              復習クイズ
            </h1>
          </div>
        </header>

        {/* メインコンテンツ */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-2xl mx-auto">
            {/* 問題 */}
            <div className="text-center mb-6">
              <p className="text-sm text-gray-500 mb-2">並べ替えて英文を作ってください</p>
              <h2 className="text-2xl font-bold text-gray-800">{currentReviewQuestion.questionJa}</h2>
            </div>

            {/* 選択済みタイル（回答エリア） */}
            <div className="bg-gradient-to-b from-orange-50 to-pink-50 rounded-3xl shadow-lg p-6 mb-4 min-h-24">
              <div className="flex flex-wrap gap-2 justify-center">
                {selectedTiles.length === 0 ? (
                  <p className="text-gray-400 text-sm">タップして単語を選んでください</p>
                ) : (
                  selectedTiles.map((word, index) => (
                    <button
                      key={`selected-${index}`}
                      onClick={() => tileCorrect === null && handleTileDeselect(word, index)}
                      disabled={tileCorrect !== null}
                      className={`px-4 py-2 rounded-xl font-bold text-lg transition-all ${
                        tileCorrect === null
                          ? 'bg-orange-500 text-white hover:bg-orange-600'
                          : tileCorrect
                          ? 'bg-green-500 text-white'
                          : 'bg-red-500 text-white'
                      }`}
                    >
                      {word}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* 選択可能なタイル */}
            {tileCorrect === null && (
              <div className="bg-gray-100 rounded-3xl p-6 mb-4">
                <div className="flex flex-wrap gap-2 justify-center">
                  {shuffledTiles.map((word, index) => (
                    <button
                      key={`tile-${index}`}
                      onClick={() => handleTileSelect(word, index)}
                      className="px-4 py-2 bg-white border-2 border-gray-300 rounded-xl font-bold text-lg text-gray-700 hover:border-orange-400 hover:bg-orange-50 transition-all"
                    >
                      {word}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 結果表示 */}
            {tileCorrect !== null && (
              <div className={`rounded-2xl p-6 mb-4 ${tileCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">
                    {tileCorrect ? '⭕' : '❌'}
                  </div>
                  <h3 className={`text-xl font-black ${tileCorrect ? 'text-green-600' : 'text-red-600'}`}>
                    {tileCorrect ? '正解！' : '不正解'}
                  </h3>
                </div>
                {!tileCorrect && (
                  <div className="bg-white rounded-xl p-4 text-center">
                    <p className="text-sm text-gray-500 mb-1">正解</p>
                    <p className="text-lg font-semibold text-green-700">{currentReviewQuestion.correctEn}</p>
                  </div>
                )}
              </div>
            )}

            {/* ボタン */}
            {tileCorrect === null ? (
              <button
                onClick={checkTileAnswer}
                disabled={selectedTiles.length === 0}
                className="w-full py-4 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xl font-bold rounded-xl hover:from-orange-600 hover:to-pink-600 disabled:opacity-50 transition-all"
              >
                回答する
              </button>
            ) : (
              <div className="flex gap-3">
                {!tileCorrect && (
                  <button
                    onClick={handleReviewRetry}
                    className="flex-1 py-3 border-2 border-orange-500 text-orange-500 font-bold rounded-xl hover:bg-orange-50 transition-all"
                  >
                    やり直す
                  </button>
                )}
                <button
                  onClick={handleReviewNext}
                  className={`${tileCorrect ? 'w-full' : 'flex-1'} py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold rounded-xl hover:from-orange-600 hover:to-pink-600 transition-all`}
                >
                  {reviewIndex + 1 >= reviewQuestions.length ? '復習完了' : '次へ →'}
                </button>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // 通常モード
  const displayQuestion = currentQuestion?.questionJa;
  const expectedAnswer = currentQuestion?.expectedEn;
  const modelAnswersList = aiEvaluation?.modelAnswers && aiEvaluation.modelAnswers.length > 0
    ? aiEvaluation.modelAnswers
    : judgeResult?.correctEn
      ? [judgeResult.correctEn]
      : [];
  const correctionTarget = aiEvaluation?.correctedUserAnswer || aiEvaluation?.correction || judgeResult?.correctEn || '';
  const wordDiff = getWordDiff(editableText || '', correctionTarget);
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
  const totalQuestions = questionsQueue.length || session.totalQuestions || TOTAL_QUESTIONS;

  return renderInMobileFrame(
    <>
      {/* ヘッダー */}
      <header className="relative z-10 px-4 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <a
            href={backLink}
            className="inline-flex items-center gap-2 whitespace-nowrap shrink-0 text-blue-700 hover:text-blue-900 font-semibold bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-sm border border-white/60"
          >
            <span aria-hidden>←</span>
            <span className="leading-none">戻る</span>
          </a>

          <div className="text-right">
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-bold">
              {session.currentIndex + 1}/{totalQuestions}
            </span>
          </div>
        </div>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          {headerTitle.partLabel && (
            <div className="mb-1">
              <span className={badgeClass}>
                {headerTitle.partLabel}
              </span>
            </div>
          )}
          <h1 className="text-xl font-black text-gray-900">
            AI応用ドリル
          </h1>
        </div>
      </header>

      {/* メインコンテンツ */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto">
          {/* 進捗バー */}
          {phase !== 'loading' && (
            <div className="mb-6">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${((session.currentIndex + 1) / totalQuestions) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* エラー表示 */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
              {error}
            </div>
          )}

          {/* ローディング */}
          {phase === 'loading' && (
            <div className="text-center py-12">
              <div className="inline-block w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-600 font-semibold">問題を生成中...</p>
            </div>
          )}

          {/* 問題表示（回答前） */}
          {(phase === 'question' || phase === 'recording') && !showAnswer && !judgeResult && (
            <>
              <div className="text-center mb-6">
                <p className="text-sm text-gray-500 mb-2">問題</p>
                <h2 className="text-3xl font-bold text-gray-800">{displayQuestion}</h2>
              </div>

              <button
                onClick={() => displayQuestion && speakJapanese(displayQuestion)}
                className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 py-4 px-8 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-full mb-8 hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg"
              >
                <span className="text-xl">🔊</span>
                <span>日本語を聞く</span>
              </button>

              <div className="bg-gradient-to-b from-purple-50 to-pink-50 rounded-3xl shadow-lg p-8 mb-4">
                <h3 className="text-center font-bold text-gray-700 mb-6">回答</h3>

                <div className="flex flex-col items-center">
                  <button
                    onClick={isListening ? handleStopRecording : handleStartRecording}
                    disabled={isAiLoading}
                    className={`w-24 h-24 rounded-full flex items-center justify-center shadow-xl transition-all transform hover:scale-105 ${
                      isListening
                        ? 'bg-red-500 animate-pulse'
                        : isAiLoading
                        ? 'bg-gray-400'
                        : 'bg-red-500 hover:bg-red-600'
                    }`}
                  >
                    <div className={`w-20 h-20 rounded-full border-4 border-white/30 flex items-center justify-center ${
                      isListening ? 'bg-red-600' : isAiLoading ? 'bg-gray-500' : 'bg-red-600'
                    }`}>
                      {isAiLoading ? (
                        <span className="text-white text-sm font-bold">処理中...</span>
                      ) : isListening ? (
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
                        <div className="w-4 h-4 bg-white rounded-full" />
                      )}
                    </div>
                  </button>

                  <p className="text-gray-500 mt-4 text-sm">
                    {isAiLoading ? '判定中...' : isListening ? '聞き取り中...' : 'タップして録音'}
                  </p>

                  {editableText && !isAiLoading && (
                    <div className="w-full mt-6">
                      <p className="text-xs text-gray-500 mb-1 text-center">文字起こしを修正</p>
                      <textarea
                        value={editableText}
                        onChange={(e) => setEditableText(e.target.value)}
                        placeholder="ここで修正してから判定できます。"
                        className="w-full p-3 border-2 border-purple-200 rounded-xl focus:outline-none focus:border-purple-400 resize-none text-gray-800 text-center"
                        rows={2}
                      />
                      <button
                        onClick={handleJudge}
                        disabled={isAiLoading || !editableText.trim()}
                        className="w-full mt-3 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-all"
                      >
                        判定する
                      </button>
                    </div>
                  )}

                  <button
                    onClick={handleShowAnswer}
                    className="mt-6 px-6 py-2 border-2 border-purple-400 text-purple-500 font-semibold rounded-full hover:bg-purple-50 transition-all"
                  >
                    わからない・答えを見る
                  </button>
                </div>

                {recognitionError && (
                  <p className="text-sm text-red-500 mt-4 text-center">{recognitionError}</p>
                )}
              </div>
            </>
          )}

          {/* 答えを見るモード */}
          {showAnswer && !judgeResult && (
            <>
              <div className="text-center mb-6">
                <p className="text-sm text-gray-500 mb-2">問題</p>
                <h2 className="text-3xl font-bold text-gray-800">{displayQuestion}</h2>
              </div>

              <div className="bg-gradient-to-b from-purple-50 to-pink-50 rounded-3xl shadow-lg p-6 mb-4">
                {/* 回答例 */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-lg p-4 mb-4 border border-blue-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📚</span>
                      <span className="text-sm font-bold text-blue-700">回答例</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm text-center">
                    <p className="text-gray-800 font-bold text-lg leading-relaxed">
                      {expectedAnswer}
                    </p>
                    <div className="mt-3 flex justify-center">
                      <button
                        onClick={() => expectedAnswer && speakEnglish(expectedAnswer)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-all text-sm font-semibold"
                      >
                        ▶ 発音を聞く
                      </button>
                    </div>
                  </div>
                </div>

                {/* 未回答表示 */}
                <div className="bg-gray-100 rounded-2xl p-4 mb-4 text-center">
                  <span className="text-gray-500 font-bold">未回答</span>
                  <p className="text-sm text-gray-600 mt-1">声に出して練習してみましょう！</p>
                </div>

                {/* 正解 */}
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4">
                  <span className="text-xs text-green-600 font-bold">正解</span>
                  <p className="mt-1 text-gray-800 font-bold text-lg">{expectedAnswer}</p>
                </div>

                {/* 未回答の解説（スピーキング評価） */}
                {aiEvaluation?.patternJa && (
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4">
                    <span className="text-xs text-blue-600 font-bold">📐 英語の型（パターン）</span>
                    <p className="mt-1 text-gray-700 text-sm">{aiEvaluation.patternJa}</p>
                  </div>
                )}
                {aiEvaluation?.breakdownJa && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 mb-4">
                    <span className="text-xs text-indigo-600 font-bold">🔗 日本語→英語の対応</span>
                    <p className="mt-1 text-gray-700 text-sm">{aiEvaluation.breakdownJa}</p>
                  </div>
                )}
                {aiEvaluation?.keyPointJa && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-4">
                    <span className="text-xs text-yellow-600 font-bold">💡 覚えるポイント</span>
                    <p className="mt-1 text-gray-700 text-sm">{aiEvaluation.keyPointJa}</p>
                  </div>
                )}
                {aiEvaluation?.encouragement && (
                  <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-4 text-center">
                    <p className="text-orange-700 font-semibold">{aiEvaluation.encouragement}</p>
                  </div>
                )}
                {!isAiLoading && (
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={handleRetry}
                      className="px-6 py-3 border-2 border-purple-500 text-purple-500 font-bold rounded-xl hover:bg-purple-50 transition-all"
                    >
                      やり直す
                    </button>
                    <button
                      onClick={handleNextFromShowAnswer}
                      className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all"
                    >
                      次へ →
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* 判定中 */}
          {phase === 'judging' && (
            <div className="bg-white rounded-2xl shadow-lg p-8 mb-4">
              <div className="flex flex-col items-center justify-center">
                <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mb-4"></div>
                <p className="text-lg font-bold text-gray-700">判定中...</p>
                <p className="text-sm text-gray-500 mt-2">AIがあなたの回答を評価しています</p>
              </div>
            </div>
          )}

          {/* 結果表示 */}
          {phase === 'result' && judgeResult && (
            <>
              {/* 回答例カルーセル */}
              {modelAnswersList.length > 0 && (
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

                  <div className="relative overflow-hidden">
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        {modelAnswersList.length > 1 && (
                          <button
                            onClick={() => setAnswerExampleIndex((prev) => Math.max(0, prev - 1))}
                            disabled={answerExampleIndex === 0}
                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-500 disabled:opacity-20 transition-all"
                          >
                            ‹
                          </button>
                        )}

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

                      <div className="mt-3 flex justify-center">
                        <button
                          onClick={() => speakEnglish(modelAnswersList[answerExampleIndex])}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-all text-sm font-semibold"
                        >
                          ▶ 発音を聞く
                        </button>
                      </div>
                    </div>
                  </div>

                  {modelAnswersList.length > 1 && (
                    <p className="text-center text-xs text-gray-400 mt-2">
                      ← → で他の言い方を見る
                    </p>
                  )}
                </div>
              )}

              {isNoSpeech ? (
                <>
                  <div className="bg-gray-100 rounded-2xl p-4 mb-3 text-center">
                    <span className="text-gray-500 font-bold">未回答</span>
                    <p className="text-sm text-gray-600 mt-1">
                      {aiEvaluation?.feedback || '声に出して練習してみましょう！'}
                    </p>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-3">
                    <span className="text-xs text-green-600 font-bold">正解</span>
                    <p className="mt-1 text-gray-800 font-bold text-lg">
                      {aiEvaluation?.correction || expectedAnswer}
                    </p>
                  </div>

                  {aiEvaluation?.patternJa && (
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-3">
                      <span className="text-xs text-blue-600 font-bold">📐 英語の型（パターン）</span>
                      <p className="mt-1 text-gray-700 text-sm">{aiEvaluation.patternJa}</p>
                    </div>
                  )}
                  {aiEvaluation?.breakdownJa && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 mb-3">
                      <span className="text-xs text-indigo-600 font-bold">🔗 日本語→英語の対応</span>
                      <p className="mt-1 text-gray-700 text-sm">{aiEvaluation.breakdownJa}</p>
                    </div>
                  )}
                  {aiEvaluation?.keyPointJa && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-3">
                      <span className="text-xs text-yellow-600 font-bold">💡 覚えるポイント</span>
                      <p className="mt-1 text-gray-700 text-sm">{aiEvaluation.keyPointJa}</p>
                    </div>
                  )}
                  {aiEvaluation?.naturalExpressions && aiEvaluation.naturalExpressions.length > 1 && (
                    <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-3">
                      <span className="text-xs text-green-600 font-bold">✨ 他の言い方</span>
                      <ul className="mt-1 space-y-1">
                        {aiEvaluation.naturalExpressions
                          .filter((expr) => expr !== expectedAnswer)
                          .map((expr, i) => (
                            <li key={i} className="text-gray-700 text-sm">• {expr}</li>
                          ))}
                      </ul>
                    </div>
                  )}
                  {!hasNoSpeechExplanation && aiEvaluation?.feedback && (
                    <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 mb-3">
                      <span className="text-xs text-purple-600 font-bold">💡 解説</span>
                      <p className="mt-1 text-gray-700 text-sm">{aiEvaluation.feedback}</p>
                    </div>
                  )}
                  {aiEvaluation?.encouragement && (
                    <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-3 text-center">
                      <p className="text-orange-700 font-semibold">{aiEvaluation.encouragement}</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="bg-white rounded-2xl shadow-lg p-4 mb-3">
                    <span className="text-xs text-gray-500">判定結果</span>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all bg-gradient-to-r from-orange-400 via-yellow-400 to-teal-400"
                          style={{ width: `${similarity ?? 0}%` }}
                        />
                      </div>
                      <span className="text-lg font-bold text-gray-800">{similarity ?? 0}%</span>
                    </div>
                  </div>

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

                  {(similarity ?? 0) < 100 && (
                    <>
                      <div className="flex justify-center my-2">
                        <span className="text-gray-400 text-2xl">▼</span>
                      </div>
                      <div className="bg-green-50 border border-green-300 rounded-2xl p-4 mb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-green-600 font-bold">訂正後</span>
                              {aiEvaluation?.correctedUserAnswer && (
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
                            onClick={() => speakEnglish(correctionTarget)}
                            className="ml-3 w-10 h-10 bg-teal-500 text-white rounded-full flex items-center justify-center hover:bg-teal-600 transition-all flex-shrink-0"
                          >
                            ▶
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {aiEvaluation?.mistakeAnalysis && (similarity ?? 0) < 100 && (
                    <div className="bg-orange-50 border border-orange-300 rounded-2xl p-4 mb-3">
                      <span className="text-xs text-orange-600 font-bold">❗ 間違えた箇所</span>
                      <p className="mt-1 text-gray-700 text-sm">{aiEvaluation.mistakeAnalysis}</p>
                    </div>
                  )}
                  {aiEvaluation?.grammarRule && (similarity ?? 0) < 100 && (
                    <div className="bg-purple-50 border border-purple-300 rounded-2xl p-4 mb-3">
                      <span className="text-xs text-purple-600 font-bold">📚 文法ルール</span>
                      <p className="mt-1 text-gray-700 text-sm">{aiEvaluation.grammarRule}</p>
                    </div>
                  )}
                  {aiEvaluation?.nuanceDifference && (similarity ?? 0) < 100 && (
                    <div className="bg-green-50 border border-green-300 rounded-2xl p-4 mb-3">
                      <span className="text-xs text-green-600 font-bold">💡 ニュアンスの違い</span>
                      <p className="mt-1 text-gray-700 text-sm">{aiEvaluation.nuanceDifference}</p>
                    </div>
                  )}
                  {aiEvaluation?.feedback && (
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

              {!isAiLoading && (
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleRetry}
                    className="flex-1 py-3 bg-white border-2 border-blue-500 text-blue-500 font-bold rounded-2xl hover:bg-blue-50 transition-all"
                  >
                    やり直す ↺
                  </button>
                  <button
                    onClick={() => handleNext()}
                    className="flex-1 py-3 bg-gradient-to-r from-green-400 to-green-500 text-white font-bold rounded-2xl hover:from-green-500 hover:to-green-600 transition-all"
                  >
                    {session.currentIndex + 1 >= totalQuestions ? '結果を見る' : '次へ →'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
