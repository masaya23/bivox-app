'use client';

import { useEffect, useRef, useState } from 'react';
import { useTTS } from '@/hooks/useTTS';
import { useOpenAITTS } from '@/hooks/useOpenAITTS';
import { updateStreak } from '@/utils/streak';
import type { Sentence } from '@/types/sentence';

// ダミーデータ（10問）
const DUMMY_SENTENCES: Sentence[] = [
  { id: '1', jp: '今日はいい天気ですね。', en: "It's nice weather today.", tags: ['日常会話'], level: 'A1' },
  { id: '2', jp: 'コーヒーを一杯いただけますか？', en: 'Can I have a cup of coffee?', tags: ['日常会話', '食事'], level: 'A1' },
  { id: '3', jp: '駅への行き方を教えてください。', en: 'Could you tell me how to get to the station?', tags: ['旅行', '日常会話'], level: 'A2' },
  { id: '4', jp: 'この仕事は来週までに終わらせる必要があります。', en: 'I need to finish this work by next week.', tags: ['仕事'], level: 'B1' },
  { id: '5', jp: '週末は何をする予定ですか？', en: 'What are you planning to do this weekend?', tags: ['日常会話'], level: 'A2' },
  { id: '6', jp: '電車が遅れているようです。', en: 'It seems the train is delayed.', tags: ['旅行', '日常会話'], level: 'A2' },
  { id: '7', jp: 'もう少しゆっくり話していただけますか？', en: 'Could you speak a little more slowly?', tags: ['日常会話'], level: 'A2' },
  { id: '8', jp: 'この資料を明日までにチェックしてください。', en: 'Please check this document by tomorrow.', tags: ['仕事'], level: 'B1' },
  { id: '9', jp: '会議は何時に始まりますか？', en: 'What time does the meeting start?', tags: ['仕事'], level: 'A2' },
  { id: '10', jp: 'すみません、道に迷ってしまいました。', en: "Excuse me, I'm lost.", tags: ['旅行', '日常会話'], level: 'A2' },
];

export const DEFAULT_SPEAKING_SENTENCES = DUMMY_SENTENCES;

interface SpeakingTrainerProps {
  initialSentences?: Sentence[];
  pageTitle?: string;
  backLink?: string;
}

interface AIEvaluation {
  score: number;
  isCorrect: boolean;
  meaningCorrect: boolean;
  grammarCorrect: boolean;
  feedback: string;
  correction: string;
  explanation: string;
  encouragement: string;
  naturalExpressions?: string[];
  grammarRule?: string;
  nuanceDifference?: string;
  mistakeAnalysis?: string;
  // 未回答モード専用フィールド
  patternJa?: string;
  breakdownJa?: string;
  keyPointJa?: string;
}

// 単語レベルで差分を計算する関数（LCS ベースでより正確な差分）
interface WordDiffResult {
  userDiff: { word: string; type: 'correct' | 'wrong' | 'missing' }[];
  correctionDiff: { word: string; type: 'correct' | 'added' }[];
}

function getWordDiff(userText: string, correctText: string): WordDiffResult {
  // 単語を抽出（句読点を保持しつつ分割）
  const tokenize = (text: string) => text.split(/\s+/).filter(Boolean);
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
}: SpeakingTrainerProps) {
  const [sentences, setSentences] = useState<Sentence[]>(
    initialSentences && initialSentences.length > 0 ? initialSentences : DUMMY_SENTENCES
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
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

  // 回答例のナビゲーション
  const [answerExampleIndex, setAnswerExampleIndex] = useState(0);

  // 答えを見るモード
  const [showAnswer, setShowAnswer] = useState(false);

  // 無音（未回答）フラグ
  const [isNoSpeech, setIsNoSpeech] = useState(false);

  // TTS
  const { speak: speakJapanese, stop: stopJapanese, isSpeaking: isPlayingJapanese } = useOpenAITTS({ lang: 'ja' });
  const { speak: speakEnglish, stop: stopEnglish, isSpeaking: isPlayingEnglish } = useTTS({ rate: 0.9 });

  const recognitionRef = useRef<any>(null);
  const currentSentence = sentences[currentIndex];

  // 初期化
  useEffect(() => {
    if (initialSentences && initialSentences.length > 0) {
      setSentences(initialSentences);
      setCurrentIndex(0);
    }
  }, [initialSentences]);

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
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setRecognitionError(null);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      setRecognizedText(transcript);
      setEditableText(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      const err = String(event?.error || 'unknown');
      if (err === 'no-speech') {
        // 無音の場合は自動で結果画面に移動
        setIsNoSpeech(true);
        setIsListening(false);
      } else if (err === 'not-allowed' || err === 'service-not-allowed') {
        setRecognitionError('マイクの許可が必要です（ブラウザの権限設定を確認してください）。');
        setIsListening(false);
      } else {
        setRecognitionError(`音声認識エラー: ${err}`);
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      try { recognition.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    };
  }, []);

  // 初回マウント時に日本語を自動再生し、終了後に自動録音開始
  useEffect(() => {
    stopJapanese();
    stopEnglish();
    setIsNoSpeech(false);

    const playAndRecord = async () => {
      try {
        await speakJapanese(currentSentence.jp);
        // 日本語再生終了後、少し待ってから自動録音開始
        setTimeout(() => {
          if (recognitionRef.current && !hasJudged && !showAnswer) {
            setRecognitionError(null);
            try {
              recognitionRef.current.start();
            } catch {
              // 既に録音中の場合など
            }
          }
        }, 300);
      } catch {
        // ignore
      }
    };

    playAndRecord();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, currentSentence.jp]);

  // 無音時の自動AI解説取得
  useEffect(() => {
    if (!isNoSpeech) return;

    const getNoSpeechEvaluation = async () => {
      setIsAiLoading(true);
      setHasJudged(true);
      setEditableText('（未回答）');

      try {
        const response = await fetch('/api/evaluate-speaking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            japaneseText: currentSentence.jp,
            correctAnswer: currentSentence.en,
            userAnswer: '（未回答・無音）',
          }),
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'AI評価に失敗しました');
        }

        setAiEvaluation(data.evaluation);
        setSimilarity(0);
      } catch {
        setAiEvaluation({
          score: 0,
          isCorrect: false,
          meaningCorrect: false,
          grammarCorrect: false,
          feedback: '回答がありませんでした。正解を確認して、声に出して練習してみましょう！',
          correction: currentSentence.en,
          explanation: '',
          encouragement: '次は声に出してチャレンジしてみましょう！',
          grammarRule: '',
          mistakeAnalysis: '',
        });
        setSimilarity(0);
      } finally {
        setIsAiLoading(false);
      }
    };

    getNoSpeechEvaluation();
  }, [isNoSpeech, currentSentence.jp, currentSentence.en]);

  const handlePlayJapanese = () => {
    stopJapanese();
    stopEnglish();
    speakJapanese(currentSentence.jp).catch(() => {});
  };

  const handleStartRecording = () => {
    if (!recognitionRef.current || isListening) return;
    stopJapanese();
    stopEnglish();
    setRecognitionError(null);
    setHasJudged(false);
    setAiEvaluation(null);
    setSimilarity(null);
    try {
      recognitionRef.current.start();
    } catch {
      setRecognitionError('音声認識を開始できませんでした。ページを再読み込みしてお試しください。');
    }
  };

  const handleStopRecording = () => {
    if (!recognitionRef.current || !isListening) return;
    try { recognitionRef.current.stop(); } catch { /* ignore */ }
  };

  const handleJudge = async () => {
    if (!editableText.trim()) return;

    setIsAiLoading(true);
    setHasJudged(true);

    try {
      const response = await fetch('/api/evaluate-speaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          japaneseText: currentSentence.jp,
          correctAnswer: currentSentence.en,
          userAnswer: editableText,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'AI評価に失敗しました');
      }

      setAiEvaluation(data.evaluation);
      setSimilarity(data.evaluation.score);
      if (data.evaluation.score >= 70) {
        setCorrectCount((prev) => prev + 1);
      }
    } catch (error) {
      setAiEvaluation({
        score: 0,
        isCorrect: false,
        meaningCorrect: false,
        grammarCorrect: false,
        feedback: 'エラーが発生しました。再度お試しください。',
        correction: currentSentence.en,
        explanation: '',
        encouragement: '',
      });
      setSimilarity(0);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleRetry = () => {
    setRecognizedText('');
    setEditableText('');
    setHasJudged(false);
    setAiEvaluation(null);
    setSimilarity(null);
    setAnswerExampleIndex(0);
    setShowAnswer(false);
    setIsNoSpeech(false);
    // 日本語を再生し、終了後に自動録音
    const playAndRecord = async () => {
      try {
        await speakJapanese(currentSentence.jp);
        setTimeout(() => {
          if (recognitionRef.current && !hasJudged && !showAnswer) {
            try {
              recognitionRef.current.start();
            } catch {
              // ignore
            }
          }
        }, 300);
      } catch {
        // ignore
      }
    };
    playAndRecord();
  };

  const handleShowAnswer = async () => {
    setShowAnswer(true);
    setIsAiLoading(true);
    setHasJudged(true);
    setIsNoSpeech(true);  // 未回答モードとして扱う
    setEditableText('（答えを見る）');

    try {
      const response = await fetch('/api/evaluate-speaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          japaneseText: currentSentence.jp,
          correctAnswer: currentSentence.en,
          userAnswer: '（未回答・答えを見る）',
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'AI評価に失敗しました');
      }

      setAiEvaluation(data.evaluation);
      setSimilarity(0);
    } catch {
      setAiEvaluation({
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
      });
      setSimilarity(0);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleNext = () => {
    stopJapanese();
    stopEnglish();

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
      updateStreak();
    }
  };

  const handleReset = () => {
    stopJapanese();
    stopEnglish();
    setCurrentIndex(0);
    setIsCompleted(false);
    setCorrectCount(0);
    setRecognizedText('');
    setEditableText('');
    setHasJudged(false);
    setAiEvaluation(null);
    setSimilarity(null);
    setAnswerExampleIndex(0);
    setShowAnswer(false);
    setIsNoSpeech(false);
  };

  const handlePlayAnswer = () => {
    stopJapanese();
    stopEnglish();
    const textToSpeak = aiEvaluation?.naturalExpressions?.[answerExampleIndex] || currentSentence.en;
    speakEnglish(textToSpeak).catch(() => {});
  };

  // 回答例の配列を作成（重複を除去、正規化して比較）
  const normalizeText = (text: string) => text.toLowerCase().replace(/[^\w\s]/g, '').trim();
  const answerExamples = (() => {
    const baseAnswer = currentSentence.en;
    const expressions = aiEvaluation?.naturalExpressions || [];

    // 正規化したテキストでSetを使って重複除去
    const seen = new Set<string>();
    const unique: string[] = [];

    // まず基本回答を追加
    seen.add(normalizeText(baseAnswer));
    unique.push(baseAnswer);

    // naturalExpressionsから重複していないものを追加
    for (const expr of expressions) {
      const normalized = normalizeText(expr);
      if (!seen.has(normalized)) {
        seen.add(normalized);
        unique.push(expr);
      }
    }

    return unique;
  })();

  if (!browserSupported) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-8 text-center max-w-xl">
          <h1 className="text-2xl font-bold text-gray-800 mb-3">スピーキングモード</h1>
          <p className="text-gray-600">このブラウザは音声認識に対応していません。Google Chromeでお試しください。</p>
          <a href={backLink} className="inline-block mt-6 text-blue-600 hover:text-blue-800 font-semibold">← 戻る</a>
        </div>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 text-center mb-4">完了！</h1>
          <p className="text-center text-gray-600 mb-6">
            {sentences.length}問中 {correctCount}問 正解
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-all"
            >
              もう一度
            </button>
            <a
              href={backLink}
              className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl text-center hover:bg-gray-200 transition-all"
            >
              ← 戻る
            </a>
          </div>
        </div>
      </div>
    );
  }

  const wordDiff = hasJudged && aiEvaluation && !isNoSpeech
    ? getWordDiff(editableText, aiEvaluation.correction || currentSentence.en)
    : { userDiff: [], correctionDiff: [] };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-2xl mx-auto p-4">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <a href={backLink} className="text-gray-500 hover:text-gray-700 font-medium">← 戻る</a>
          <span className="text-gray-500">{currentIndex + 1} / {sentences.length}</span>
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
          <span className="text-xl">🔊</span>
          <span>{isPlayingJapanese ? '再生中...' : '日本語を聞く'}</span>
        </button>

        {/* 回答セクション */}
        <div className="bg-gradient-to-b from-blue-50 to-green-50 rounded-3xl shadow-lg p-8 mb-4">
          <h2 className="text-center font-bold text-gray-700 mb-6">回答</h2>

          {/* 大きな録音ボタン */}
          {!hasJudged && !showAnswer && (
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
                {/* 内側の白い縁取り */}
                <div className={`w-20 h-20 rounded-full border-4 border-white/30 flex items-center justify-center ${
                  isListening ? 'bg-red-600' : isAiLoading ? 'bg-gray-500' : 'bg-red-600'
                }`}>
                  {isAiLoading ? (
                    <span className="text-white text-sm font-bold">処理中...</span>
                  ) : isListening ? (
                    <div className="w-6 h-6 bg-white rounded-sm" /> /* 停止アイコン */
                  ) : (
                    <div className="w-4 h-4 bg-white rounded-full" /> /* 録音アイコン */
                  )}
                </div>
              </button>

              {/* ステータス表示 */}
              <p className="text-gray-500 mt-4 text-sm">
                {isAiLoading ? '判定中...' : isListening ? '話してください...' : 'タップして録音'}
              </p>

              {/* 文字起こし結果表示・修正エリア */}
              {editableText && !isAiLoading && (
                <div className="w-full mt-6">
                  <p className="text-xs text-gray-500 mb-1 text-center">文字起こしを修正</p>
                  <textarea
                    value={editableText}
                    onChange={(e) => setEditableText(e.target.value)}
                    placeholder="ここで修正してから判定できます。"
                    className="w-full p-3 border-2 border-blue-200 rounded-xl focus:outline-none focus:border-blue-400 resize-none text-gray-800 text-center"
                    rows={2}
                  />
                  <button
                    onClick={handleJudge}
                    disabled={isAiLoading || !editableText.trim()}
                    className="w-full mt-3 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 transition-all"
                  >
                    判定する
                  </button>
                </div>
              )}

              {/* わからない・答えを見るボタン */}
              <button
                onClick={handleShowAnswer}
                className="mt-6 px-6 py-2 border-2 border-blue-400 text-blue-500 font-semibold rounded-full hover:bg-blue-50 transition-all"
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
                    speakEnglish(currentSentence.en).catch(() => {});
                  }}
                  disabled={isPlayingEnglish}
                  className="mt-3 px-4 py-2 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 disabled:opacity-50 transition-all"
                >
                  {isPlayingEnglish ? '再生中...' : '▶ 発音を聞く'}
                </button>
              </div>
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
              <p className="text-lg font-bold text-gray-700">判定中...</p>
              <p className="text-sm text-gray-500 mt-2">AIがあなたの回答を評価しています</p>
            </div>
          </div>
        )}

        {/* 判定結果 */}
        {hasJudged && aiEvaluation && !isAiLoading && (
          <>
            {/* 回答例 */}
            <div className="bg-white rounded-2xl shadow-lg p-4 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">回答例</span>
                <div className="flex items-center gap-1">
                  {answerExamples.map((_, i) => (
                    <span
                      key={i}
                      className={`w-2 h-2 rounded-full ${i === answerExampleIndex ? 'bg-teal-500' : 'bg-gray-300'}`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <p className="flex-1 text-gray-800 font-semibold">{answerExamples[answerExampleIndex]}</p>
                <button
                  onClick={() => {
                    stopEnglish();
                    const text = answerExamples[answerExampleIndex];
                    speakEnglish(text).catch(() => {});
                  }}
                  disabled={isPlayingEnglish}
                  className="w-10 h-10 bg-teal-500 text-white rounded-full flex items-center justify-center hover:bg-teal-600 disabled:opacity-50 text-lg"
                >
                  ▶
                </button>
              </div>
              {answerExamples.length > 1 && (
                <div className="flex justify-center gap-4 mt-2 text-sm">
                  <button
                    onClick={() => setAnswerExampleIndex((prev) => Math.max(0, prev - 1))}
                    disabled={answerExampleIndex === 0}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    ← 前
                  </button>
                  <button
                    onClick={() => setAnswerExampleIndex((prev) => Math.min(answerExamples.length - 1, prev + 1))}
                    disabled={answerExampleIndex === answerExamples.length - 1}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    次→
                  </button>
                </div>
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

                {/* 下矢印 */}
                <div className="flex justify-center my-2">
                  <span className="text-gray-400 text-2xl">▼</span>
                </div>

                {/* 訂正後（緑枠・差分ハイライト付き・再生ボタン付き） */}
                <div className="bg-green-50 border border-green-300 rounded-2xl p-4 mb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <span className="text-xs text-green-600 font-bold">訂正後</span>
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
                          <span className="text-gray-800">{aiEvaluation.correction || currentSentence.en}</span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        stopEnglish();
                        speakEnglish(aiEvaluation.correction || currentSentence.en).catch(() => {});
                      }}
                      disabled={isPlayingEnglish}
                      className="ml-3 w-10 h-10 bg-teal-500 text-white rounded-full flex items-center justify-center hover:bg-teal-600 disabled:opacity-50 transition-all flex-shrink-0"
                    >
                      ▶
                    </button>
                  </div>
                </div>

                {/* 最も自然な表現（青枠） */}
                {aiEvaluation.naturalExpressions && aiEvaluation.naturalExpressions.length > 0 && (
                  <div className="bg-blue-50 border border-blue-300 rounded-2xl p-4 mb-3">
                    <span className="text-xs text-blue-600 font-bold">✨ 最も自然な表現</span>
                    <p className="mt-1 text-gray-800 font-semibold">{currentSentence.en}</p>
                    <p className="text-xs text-gray-500 mt-2">他の正解例:</p>
                    <ul className="mt-1 space-y-1">
                      {aiEvaluation.naturalExpressions.map((expr, i) => (
                        <li key={i} className="text-gray-700 text-sm">• {expr}</li>
                      ))}
                    </ul>
                  </div>
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
  );
}
