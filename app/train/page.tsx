'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useTTS } from '@/hooks/useTTS';
import { useOpenAITTS } from '@/hooks/useOpenAITTS';
import { updateStreak } from '@/utils/streak';
import type { Sentence } from '@/types/sentence';

// ダミーデータ（10問）
const DUMMY_SENTENCES = [
  {
    id: '1',
    jp: '今日はいい天気ですね。',
    en: "It's nice weather today.",
    tags: ['日常会話'],
    level: 'A1' as const,
  },
  {
    id: '2',
    jp: 'コーヒーを一杯いただけますか？',
    en: 'Can I have a cup of coffee?',
    tags: ['日常会話', '食事'],
    level: 'A1' as const,
  },
  {
    id: '3',
    jp: '駅への行き方を教えてください。',
    en: 'Could you tell me how to get to the station?',
    tags: ['旅行', '日常会話'],
    level: 'A2' as const,
  },
  {
    id: '4',
    jp: 'この仕事は来週までに終わらせる必要があります。',
    en: 'I need to finish this work by next week.',
    tags: ['仕事'],
    level: 'B1' as const,
  },
  {
    id: '5',
    jp: '週末は何をする予定ですか？',
    en: 'What are you planning to do this weekend?',
    tags: ['日常会話'],
    level: 'A2' as const,
  },
  {
    id: '6',
    jp: '電車が遅れているようです。',
    en: 'It seems the train is delayed.',
    tags: ['旅行', '日常会話'],
    level: 'A2' as const,
  },
  {
    id: '7',
    jp: 'もう少しゆっくり話していただけますか？',
    en: 'Could you speak a little more slowly?',
    tags: ['日常会話'],
    level: 'A2' as const,
  },
  {
    id: '8',
    jp: 'この資料を明日までにチェックしてください。',
    en: 'Please check this document by tomorrow.',
    tags: ['仕事'],
    level: 'B1' as const,
  },
  {
    id: '9',
    jp: '会議は何時に始まりますか？',
    en: 'What time does the meeting start?',
    tags: ['仕事'],
    level: 'A2' as const,
  },
  {
    id: '10',
    jp: 'すみません、道に迷ってしまいました。',
    en: "Excuse me, I'm lost.",
    tags: ['旅行', '日常会話'],
    level: 'A2' as const,
  },
];

type PlaybackState = 'idle' | 'playing-japanese' | 'pause' | 'playing-english' | 'interval';

interface TrainPageProps {
  initialSentences?: Sentence[];
  pageTitle?: string;
  backLink?: string;
}

export default function TrainPage({
  initialSentences,
  pageTitle, // eslint-disable-line @typescript-eslint/no-unused-vars
  backLink = '/',
}: TrainPageProps) {
  const [sentences, setSentences] = useState(
    initialSentences && initialSentences.length > 0
      ? initialSentences
      : DUMMY_SENTENCES
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [pauseDuration, setPauseDuration] = useState(3000); // デフォルト3秒
  const [intervalDuration, setIntervalDuration] = useState(2000); // 次の問題までの間隔2秒
  const [showSettings, setShowSettings] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentSentence = sentences[currentIndex];
  const isLastQuestion = currentIndex === sentences.length - 1;
  const totalQuestions = sentences.length;

  // TTS機能（英語用）
  const { speak: speakEnglish, stop: stopEnglish, currentRate, changeRate } =
    useTTS({ autoPlay: false });

  // OpenAI TTS機能（日本語用）
  const {
    speak: speakJapanese,
    stop: stopJapanese,
  } = useOpenAITTS({ lang: 'ja' });

  // initialSentencesが更新されたら反映
  useEffect(() => {
    if (initialSentences && initialSentences.length > 0) {
      setSentences(initialSentences);
    }
  }, [initialSentences]);

  // 設定の読み込み
  useEffect(() => {
    const savedSettings = localStorage.getItem('shadowingSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      if (settings.pauseDuration) setPauseDuration(settings.pauseDuration);
      if (settings.intervalDuration) setIntervalDuration(settings.intervalDuration);
      if (settings.currentRate) changeRate(settings.currentRate);
    }
  }, [changeRate]);

  // 英語音声の長さを推定（単語数 × 平均発話時間）
  const estimateEnglishDuration = (text: string): number => {
    const words = text.split(' ').length;
    // 1単語あたり約400ms（速度に応じて調整）
    const baseTimePerWord = 400;
    const adjustedTime = baseTimePerWord / currentRate;
    return words * adjustedTime;
  };

  // シャドーイングシーケンスの実行（1問分）
  const playSingleQuestion = (index: number) => {
    const sentence = sentences[index];
    const isLast = index === sentences.length - 1;

    // 1. 日本語を読み上げ
    setPlaybackState('playing-japanese');
    speakJapanese(sentence.jp);

    // 2. 日本語の読み上げ完了を待つ（約3秒と仮定）
    timeoutRef.current = setTimeout(() => {
      // 3. ポーズ（ユーザーがスピーキングする時間）
      setPlaybackState('pause');
      const estimatedDuration = estimateEnglishDuration(sentence.en);
      const actualPauseDuration = Math.max(pauseDuration, estimatedDuration);

      timeoutRef.current = setTimeout(() => {
        // 4. 英語の正解音声を読み上げ
        setPlaybackState('playing-english');
        speakEnglish(sentence.en);

        // 5. 英語の読み上げ完了を待つ
        const englishDuration = estimatedDuration + 1000; // 余裕を持って+1秒
        timeoutRef.current = setTimeout(() => {
          // 6. 次の問題までの間隔
          setPlaybackState('interval');

          timeoutRef.current = setTimeout(() => {
            // 7. 次の問題へ、または終了
            if (isLast) {
              setIsFinished(true);
              setPlaybackState('idle');
            } else {
              setCurrentIndex(index + 1);
              setPlaybackState('idle');
              // 次の問題を自動的に開始
              playSingleQuestion(index + 1);
            }
          }, intervalDuration);
        }, englishDuration);
      }, actualPauseDuration);
    }, 3000); // 日本語の読み上げ時間
  };

  // シャドーイングシーケンスの開始
  const startShadowing = () => {
    if (playbackState !== 'idle') return;
    playSingleQuestion(currentIndex);
  };

  // 停止処理
  const stopPlayback = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    stopJapanese();
    stopEnglish();
    setPlaybackState('idle');
  };

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      stopJapanese();
      stopEnglish();
    };
  }, []);

  // 設定保存
  const handleSaveSettings = () => {
    const settings = {
      pauseDuration,
      intervalDuration,
      currentRate,
    };
    localStorage.setItem('shadowingSettings', JSON.stringify(settings));
    setShowSettings(false);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFinished(false);
    setPlaybackState('idle');
  };

  // AI質問を処理
  const handleAskAI = async () => {
    if (!aiQuestion.trim()) return;

    setIsAiLoading(true);
    setAiResponse('');

    try {
      // バックエンドAPIを呼び出し
      const response = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: aiQuestion,
          sentences: sentences,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'API呼び出しに失敗しました');
      }

      setAiResponse(data.answer || '回答を生成できませんでした。');
    } catch (error) {
      console.error('AI質問エラー:', error);
      setAiResponse(
        `エラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`
      );
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleNext = () => {
    stopPlayback();
    if (isLastQuestion) {
      setIsFinished(true);
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    stopPlayback();
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // 完了時の統計保存
  useEffect(() => {
    if (isFinished) {
      const history = localStorage.getItem('trainingHistory');
      const historyArray = history ? JSON.parse(history) : [];

      historyArray.push({
        date: new Date().toISOString(),
        totalQuestions: sentences.length,
        mode: 'shadowing',
      });

      localStorage.setItem('trainingHistory', JSON.stringify(historyArray));

      const stats = {
        totalSessions: historyArray.length,
        totalQuestions: historyArray.reduce(
          (sum: number, session: any) => sum + session.totalQuestions,
          0
        ),
        lastTrainingDate: new Date().toISOString(),
      };
      localStorage.setItem('trainingStats', JSON.stringify(stats));

      updateStreak();
    }
  }, [isFinished, sentences.length]);

  // 終了画面
  if (isFinished) {
    const ITEMS_PER_PAGE = 10;
    const totalPages = Math.ceil(sentences.length / ITEMS_PER_PAGE);
    const startIndex = currentPage * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, sentences.length);
    const currentSentences = sentences.slice(startIndex, endIndex);

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl p-8 md:p-12">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-4xl font-black text-gray-800 mb-4">
              完了！
            </h1>
            <p className="text-xl text-gray-600">
              {totalQuestions}問のシャドーイングを完了しました
            </p>
          </div>

          {/* 練習した文章一覧 */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">
                📝 練習した文章一覧
              </h3>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                    className="px-3 py-1 bg-white rounded-lg font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ←
                  </button>
                  <span className="text-sm text-gray-600">
                    {startIndex + 1}-{endIndex} / {sentences.length}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                    disabled={currentPage === totalPages - 1}
                    className="px-3 py-1 bg-white rounded-lg font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    →
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {currentSentences.map((sentence, index) => (
                <div
                  key={startIndex + index}
                  className="bg-white rounded-xl p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 font-bold rounded-full flex items-center justify-center text-sm">
                      {startIndex + index + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-gray-800 font-medium mb-1">
                        {sentence.jp}
                      </p>
                      <p className="text-gray-600 text-sm">
                        {sentence.en}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AIに質問ボタン */}
          <div className="mb-6">
            <button
              onClick={() => setShowAIDialog(true)}
              className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-lg font-bold rounded-2xl hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 shadow-lg"
            >
              🤖 AIに質問する
            </button>
          </div>

          {/* ボタン */}
          <div className="space-y-3">
            <button
              onClick={handleRestart}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white text-lg font-bold rounded-2xl hover:from-green-600 hover:to-blue-600 transition-all transform hover:scale-105 shadow-lg"
            >
              もう一度トレーニング
            </button>
            <Link
              href={backLink}
              className="block w-full py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl text-center hover:bg-gray-200 transition-colors"
            >
              ホームに戻る
            </Link>
          </div>
        </div>

        {/* AI質問ダイアログ */}
        {showAIDialog && (
          <div className="fixed inset-0 bg-white/4 backdrop-blur-[3px] flex items-center justify-center p-4 z-50">
            <div className="bg-white/75 backdrop-blur-[3px] border border-white/40 rounded-3xl shadow-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-800">🤖 AIに質問</h3>
                <button
                  onClick={() => {
                    setShowAIDialog(false);
                    setAiQuestion('');
                    setAiResponse('');
                  }}
                  className="text-gray-400 hover:text-gray-600 text-3xl font-bold"
                >
                  ×
                </button>
              </div>

              <div className="mb-6">
                <p className="text-gray-600 text-sm mb-4">
                  練習した文章について質問してください。文法、単語、発音などについて聞くことができます。
                </p>
                <textarea
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  placeholder="例：「look forward to」の使い方を教えてください"
                  className="w-full h-32 p-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 resize-none"
                  disabled={isAiLoading}
                />
              </div>

              {/* AI回答の表示 */}
              {aiResponse && (
                <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                  <h4 className="font-bold text-gray-800 mb-2">💡 回答</h4>
                  <div className="text-gray-700 whitespace-pre-wrap">
                    {aiResponse}
                  </div>
                </div>
              )}

              <button
                onClick={handleAskAI}
                disabled={!aiQuestion.trim() || isAiLoading}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAiLoading ? '回答を生成中...' : '質問する'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href={backLink}
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            ← ホーム
          </Link>
          <div className="flex items-center gap-4">
            {/* 速度切替 */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => changeRate(0.8)}
                className={`px-2 py-1 text-xs rounded ${
                  currentRate === 0.8
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600'
                }`}
              >
                遅
              </button>
              <button
                onClick={() => changeRate(1.0)}
                className={`px-2 py-1 text-xs rounded ${
                  currentRate === 1.0
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600'
                }`}
              >
                標準
              </button>
              <button
                onClick={() => changeRate(1.2)}
                className={`px-2 py-1 text-xs rounded ${
                  currentRate === 1.2
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600'
                }`}
              >
                速
              </button>
            </div>

            {/* 設定ボタン */}
            <button
              onClick={() => setShowSettings(true)}
              className="px-3 py-1 text-xs rounded-lg font-semibold bg-gray-200 text-gray-600 hover:bg-gray-300"
            >
              ⚙️ 設定
            </button>

            <div className="text-sm font-semibold text-gray-600">
              {currentIndex + 1} / {totalQuestions}
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          {/* 進捗バー */}
          <div className="mb-8">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all duration-300"
                style={{
                  width: `${((currentIndex + 1) / totalQuestions) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* カード */}
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 min-h-[400px] flex flex-col justify-between">
            {/* レベルとタグ */}
            <div className="flex gap-2 mb-6 flex-wrap">
              <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full font-semibold">
                {currentSentence.level}
              </span>
              {currentSentence.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* 状態表示 */}
            <div className="flex-1 flex flex-col justify-center">
              {playbackState === 'idle' && (
                <>
                  <p className="text-sm text-gray-500 mb-2 text-center">
                    日本語を聞いて、英語で答えてください
                  </p>
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-8 text-center">
                    準備完了
                  </h2>
                </>
              )}

              {playbackState === 'playing-japanese' && (
                <>
                  <div className="text-6xl mb-4 text-center animate-pulse">🎧</div>
                  <p className="text-sm text-blue-600 mb-2 text-center font-semibold">
                    日本語を聞いています...
                  </p>
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-800 text-center">
                    {currentSentence.jp}
                  </h2>
                </>
              )}

              {playbackState === 'pause' && (
                <>
                  <div className="text-6xl mb-4 text-center animate-pulse">🎤</div>
                  <p className="text-sm text-purple-600 mb-2 text-center font-semibold">
                    英語で答えてください
                  </p>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-400 text-center">
                    {currentSentence.jp}
                  </h2>
                </>
              )}

              {playbackState === 'playing-english' && (
                <>
                  <div className="text-6xl mb-4 text-center animate-pulse">🔊</div>
                  <p className="text-sm text-green-600 mb-2 text-center font-semibold">
                    正解を聞いています...
                  </p>
                  <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-6">
                    <p className="text-2xl md:text-3xl text-gray-800 font-semibold text-center">
                      {currentSentence.en}
                    </p>
                  </div>
                </>
              )}

              {playbackState === 'interval' && (
                <>
                  <div className="text-6xl mb-4 text-center">✅</div>
                  <p className="text-sm text-gray-600 mb-2 text-center font-semibold">
                    次の問題に進みます...
                  </p>
                  <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-6">
                    <p className="text-2xl md:text-3xl text-gray-800 font-semibold text-center">
                      {currentSentence.en}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* コントロールボタン */}
            <div className="mt-8 space-y-3">
              {playbackState === 'idle' ? (
                <button
                  onClick={startShadowing}
                  className="w-full py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white text-lg font-bold rounded-2xl hover:from-green-600 hover:to-blue-600 transition-all transform hover:scale-105 shadow-lg"
                >
                  ▶ スタート
                </button>
              ) : (
                <button
                  onClick={stopPlayback}
                  className="w-full py-4 bg-gradient-to-r from-red-500 to-pink-500 text-white text-lg font-bold rounded-2xl hover:from-red-600 hover:to-pink-600 transition-all transform hover:scale-105 shadow-lg"
                >
                  ⏹ 停止
                </button>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handlePrevious}
                  disabled={currentIndex === 0 || playbackState !== 'idle'}
                  className="py-3 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← 前へ
                </button>
                <button
                  onClick={handleNext}
                  disabled={playbackState !== 'idle'}
                  className="py-3 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  次へ →
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 設定ダイアログ */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800">⚙️ 設定</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-gray-600 text-3xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* ポーズ時間 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  スピーキング時間（ミリ秒）
                </label>
                <input
                  type="number"
                  min="1000"
                  max="10000"
                  step="500"
                  value={pauseDuration}
                  onChange={(e) => setPauseDuration(Number(e.target.value))}
                  className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  日本語の後、英語を話すための時間（{pauseDuration / 1000}秒）
                </p>
              </div>

              {/* 間隔時間 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  問題間の間隔（ミリ秒）
                </label>
                <input
                  type="number"
                  min="500"
                  max="5000"
                  step="500"
                  value={intervalDuration}
                  onChange={(e) => setIntervalDuration(Number(e.target.value))}
                  className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  次の問題に進むまでの時間（{intervalDuration / 1000}秒）
                </p>
              </div>

              {/* 保存ボタン */}
              <button
                onClick={handleSaveSettings}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all transform hover:scale-105 shadow-lg"
              >
                設定を保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
