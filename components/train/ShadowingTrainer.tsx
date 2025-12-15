'use client';

import { useState, useEffect, useRef } from 'react';
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

export const DEFAULT_SHADOWING_SENTENCES = DUMMY_SENTENCES;

type PlaybackState = 'idle' | 'playing-japanese' | 'pause' | 'playing-english' | 'interval';

interface TrainPageProps {
  initialSentences?: Sentence[];
  pageTitle?: string;
  backLink?: string;
}

export default function ShadowingTrainer({
  initialSentences,
  pageTitle,
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
  const runIdRef = useRef(0); // 再生シーケンス識別子（途中スキップ時のキャンセル用）
  const currentIndexRef = useRef(0);
  const currentSentence = sentences[currentIndex];
  const isLastQuestion = currentIndex === sentences.length - 1;
  const totalQuestions = sentences.length;

  // TTS機能（英語用 - ブラウザWeb Speech API）
  const { speak: speakEnglish, stop: stopEnglish, currentRate, changeRate } =
    useTTS({ autoPlay: false });

  // TTS機能（日本語用 - OpenAI TTS API）
  const { speak: speakJapanese, stop: stopJapanese } = useOpenAITTS({ lang: 'ja' });

  // initialSentencesが更新されたら反映
  useEffect(() => {
    if (initialSentences && initialSentences.length > 0) {
      setSentences(initialSentences);
    }
  }, [initialSentences]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

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

  // 英語音声の長さを推定（単語数 × 平均発話時間＋ゆとり）
  const estimateEnglishDuration = (text: string): number => {
    const words = text.split(' ').length;
    // 1単語あたり約450ms × 速度補正、さらに少し余裕を持たせる
    const baseTimePerWord = 450;
    const adjustedTime = (baseTimePerWord / currentRate) * 1.15;
    return Math.round(words * adjustedTime);
  };

  const clearTimers = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const cancelPlayback = () => {
    runIdRef.current += 1;
    clearTimers();
    stopJapanese();
    stopEnglish();
    setPlaybackState('idle');
  };

  // シャドーイングシーケンスの実行（1問分）
  const playSingleQuestion = async (index: number, runId: number) => {
    if (runIdRef.current !== runId) return;
    const sentence = sentences[index];
    const isLast = index === sentences.length - 1;

    // 1. 日本語を読み上げ（完了まで待機）
    setPlaybackState('playing-japanese');
    await speakJapanese(sentence.jp);
    if (runIdRef.current !== runId) return;

    // 2. ポーズ（ユーザーがスピーキングする時間）
    setPlaybackState('pause');
    const estimatedDuration = estimateEnglishDuration(sentence.en);
    // 英語を「余裕を持って」話せる無音を確保：推定時間＋800msを下限に
    const actualPauseDuration = Math.max(pauseDuration, estimatedDuration + 800);

    clearTimers();
    timeoutRef.current = setTimeout(() => {
      if (runIdRef.current !== runId) return;
      // 3. 英語の正解音声を読み上げ
      setPlaybackState('playing-english');
      speakEnglish(sentence.en);

      // 4. 英語の読み上げ完了を待つ
      const englishDuration = estimatedDuration + 1000; // 余裕を持って+1秒
      clearTimers();
      timeoutRef.current = setTimeout(() => {
        if (runIdRef.current !== runId) return;
        // 5. 次の問題までの間隔
        setPlaybackState('interval');

        clearTimers();
        timeoutRef.current = setTimeout(() => {
          if (runIdRef.current !== runId) return;
          // 6. 次の問題へ、または終了
          if (isLast) {
            setIsFinished(true);
            setPlaybackState('idle');
          } else {
            setCurrentIndex(index + 1);
            setPlaybackState('idle');
            // 次の問題を自動的に開始
            playSingleQuestion(index + 1, runId);
          }
        }, intervalDuration);
      }, englishDuration);
    }, actualPauseDuration);
  };

  // 任意のインデックスから再生を開始
  const startFromIndex = (index: number) => {
    cancelPlayback();
    const runId = runIdRef.current;
    setIsFinished(false);
    setCurrentIndex(index);
    currentIndexRef.current = index;
    playSingleQuestion(index, runId);
  };

  // シャドーイングシーケンスの開始
  const startShadowing = () => {
    if (playbackState !== 'idle') return;
    updateStreak();
    // すでに途中の問題にいる場合はそこから再開、完了後の再開は0から
    const startIndex = isFinished ? 0 : currentIndex;
    startFromIndex(startIndex);
  };

  // シャドーイングシーケンスの停止
  const stopShadowing = () => {
    cancelPlayback();
    setIsFinished(false);
    setCurrentIndex(0);
    currentIndexRef.current = 0;
  };

  // 次の問題へ
  const nextQuestion = () => {
    const nextIndex = Math.min(currentIndexRef.current + 1, sentences.length - 1);
    if (nextIndex === currentIndexRef.current) {
      cancelPlayback();
      setIsFinished(true);
      return;
    }
    startFromIndex(nextIndex);
  };

  // 前の問題へ
  const prevQuestion = () => {
    const prevIndex = Math.max(0, currentIndexRef.current - 1);
    if (prevIndex === currentIndexRef.current) return;
    startFromIndex(prevIndex);
  };

  // 再生を一時停止
  const pauseShadowing = () => {
    cancelPlayback();
  };

  // 次の問題までスキップ
  const skipToNext = () => {
    nextQuestion();
  };

  // 前の問題に戻る
  const skipToPrev = () => {
    prevQuestion();
  };

  // クリーンアップ
  useEffect(() => {
    return () => {
      stopJapanese();
      stopEnglish();
      clearTimers();
    };
  }, [stopJapanese, stopEnglish]);

  // 設定の保存
  const saveSettings = () => {
    const settings = {
      pauseDuration,
      intervalDuration,
      currentRate,
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl p-8 md:p-12">
          <div className="text-center mb-8">
            <div className="text-3xl font-black text-gray-800 mb-4">完了</div>
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
                練習した文章一覧
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setCurrentPage((prev) => Math.max(prev - 1, 0));
                  }}
                  disabled={currentPage === 0}
                  className={`px-3 py-1 rounded-lg font-semibold ${currentPage === 0
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  ← 前へ
                </button>
                <span className="text-sm text-gray-600">
                  {currentPage + 1} / {totalPages}ページ
                </span>
                <button
                  onClick={() => {
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1));
                  }}
                  disabled={currentPage === totalPages - 1}
                  className={`px-3 py-1 rounded-lg font-semibold ${currentPage === totalPages - 1
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  次へ →
                </button>
              </div>
            </div>

            <div className="grid gap-3">
              {currentSentences.map((sentence, index) => (
                <div
                  key={`${sentence.id}-${index}`}
                  className="bg-white rounded-xl p-4 shadow-sm border border-white/60"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-500">
                        {startIndex + index + 1}
                      </span>
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-700">
                        {sentence.level}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {sentence.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 text-xs rounded-full bg-blue-50 text-blue-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-600 mb-1">{sentence.jp}</p>
                  <p className="text-gray-900 font-bold">{sentence.en}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={startShadowing}
              className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold py-3 rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all"
            >
              もう一度練習する
            </button>
            <a
              href={backLink}
              className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl text-center hover:bg-gray-200 transition-all"
            >
              ← 戻る
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col">
      {/* 背景のグラデーション装飾 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-10 w-96 h-96 bg-gradient-to-br from-purple-200/50 to-blue-200/40 rounded-full blur-3xl" />
        <div className="absolute top-20 right-0 w-80 h-80 bg-gradient-to-br from-blue-200/40 to-teal-200/40 rounded-full blur-3xl" />
      </div>

      {/* ヘッダー */}
      <header className="relative z-10 px-4 pt-6 pb-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a
              href={backLink}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 font-semibold bg-white/70 backdrop-blur px-3 py-2 rounded-full shadow-sm border border-white/60"
            >
              ←
              <span>戻る</span>
            </a>
            <div>
              <p className="text-sm text-gray-500 font-semibold">Shadowing Mode</p>
              <h1 className="text-2xl font-black text-gray-800">
                {pageTitle || 'シャドーイング練習'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/70 backdrop-blur px-3 py-2 rounded-xl shadow-sm border border-white/60">
              <span className="text-sm font-semibold text-gray-500">英語再生速度</span>
              <div className="flex gap-1">
                <button
                  onClick={() => changeRate(Math.max(0.75, currentRate - 0.1))}
                  className="px-3 py-1 text-xs rounded-lg font-semibold bg-gray-200 text-gray-600 hover:bg-gray-300"
                >
                  遅
                </button>
                <button
                  onClick={() => changeRate(1)}
                  className="px-3 py-1 text-xs rounded-lg font-semibold bg-gray-200 text-gray-600 hover:bg-gray-300"
                >
                  等速
                </button>
                <button
                  onClick={() => changeRate(Math.min(1.5, currentRate + 0.1))}
                  className="px-3 py-1 text-xs rounded-lg font-semibold bg-gray-200 text-gray-600 hover:bg-gray-300"
                >
                  速
                </button>
              </div>

              {/* 設定ボタン */}
              <button
                onClick={() => setShowSettings(true)}
                className="px-3 py-1 text-xs rounded-lg font-semibold bg-gray-200 text-gray-600 hover:bg-gray-300"
              >
                設定
              </button>

              <div className="text-sm font-semibold text-gray-600">
                {currentIndex + 1} / {totalQuestions}
              </div>
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
                  <div className="text-3xl mb-4 text-center font-black text-blue-700">JP</div>
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
                  <div className="text-3xl mb-4 text-center font-black text-orange-700">PAUSE</div>
                  <p className="text-sm text-orange-600 mb-2 text-center font-semibold">
                    あなたの番です！英語で話してください
                  </p>
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-800 text-center">
                    {currentSentence.jp}
                  </h2>
                </>
              )}

              {playbackState === 'playing-english' && (
                <>
                  <div className="text-3xl mb-4 text-center font-black text-green-700">EN</div>
                  <p className="text-sm text-green-600 mb-2 text-center font-semibold">
                    正解の英語を確認しましょう
                  </p>
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-800 text-center">
                    {currentSentence.en}
                  </h2>
                </>
              )}

              {playbackState === 'interval' && (
                <>
                  <div className="text-3xl mb-4 text-center font-black text-purple-700">NEXT</div>
                  <p className="text-sm text-purple-600 mb-2 text-center font-semibold">
                    次の問題まで少し休憩...
                  </p>
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-800 text-center">
                    {currentSentence.en}
                  </h2>
                </>
              )}
            </div>

            {/* コントロールボタン */}
            <div className="grid grid-cols-2 gap-3 mt-8">
              <button
                onClick={playbackState === 'idle' ? startShadowing : pauseShadowing}
                className={`col-span-2 py-3 rounded-xl text-white font-bold text-lg transition-all ${playbackState === 'idle'
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600'
                  : 'bg-gray-400 hover:bg-gray-500'
                  }`}
              >
                {playbackState === 'idle' ? '練習開始' : '停止'}
              </button>

              <button
                onClick={skipToPrev}
                disabled={currentIndex === 0}
                className={`py-3 rounded-xl font-bold text-lg transition-all ${currentIndex === 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                ← 前の問題
              </button>

              <button
                onClick={skipToNext}
                className="py-3 rounded-xl font-bold text-lg transition-all bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                次の問題 →
              </button>

              <button
                onClick={stopShadowing}
                className="col-span-2 py-3 rounded-xl font-bold text-lg transition-all bg-red-500 text-white hover:bg-red-600"
              >
                練習を終了
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* 設定モーダル */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-lg w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">設定</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* ポーズ時間設定 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-semibold text-gray-700">
                    ポーズ時間（秒）
                  </label>
                  <span className="text-sm text-gray-500">
                    英語を話す時間の長さ
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={pauseDuration / 1000}
                  onChange={(e) => setPauseDuration(Number(e.target.value) * 1000)}
                  className="w-full"
                />
                <div className="text-right text-sm text-gray-600">
                  {pauseDuration / 1000} 秒
                </div>
              </div>

              {/* 次の問題までの間隔 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-semibold text-gray-700">
                    次の問題までの間隔（秒）
                  </label>
                  <span className="text-sm text-gray-500">
                    正解後の休憩時間
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.5"
                  value={intervalDuration / 1000}
                  onChange={(e) => setIntervalDuration(Number(e.target.value) * 1000)}
                  className="w-full"
                />
                <div className="text-right text-sm text-gray-600">
                  {intervalDuration / 1000} 秒
                </div>
              </div>

              {/* 英語の再生速度 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-semibold text-gray-700">
                    英語の再生速度
                  </label>
                  <span className="text-sm text-gray-500">
                    0.75x - 1.5x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.5"
                  step="0.05"
                  value={currentRate}
                  onChange={(e) => changeRate(Number(e.target.value))}
                  className="w-full"
                />
                <div className="text-right text-sm text-gray-600">
                  {currentRate.toFixed(2)} x
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={saveSettings}
                className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold py-3 rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all"
              >
                設定を保存
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition-all"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI質問ダイアログ */}
      {showAIDialog && (
        <div className="fixed inset-0 bg-white/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">AIに質問</h3>
              <button
                onClick={() => {
                  setShowAIDialog(false);
                  setAiQuestion('');
                  setAiResponse('');
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="mb-4">
              <p className="text-gray-600 text-sm mb-3">
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
              <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                <h4 className="font-bold text-gray-800 mb-2">回答</h4>
                <div className="text-gray-700 whitespace-pre-wrap">
                  {aiResponse}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={async () => {
                  if (!aiQuestion.trim()) return;
                  setIsAiLoading(true);

                  try {
                    const response = await fetch('/api/gpt', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        message: aiQuestion,
                        context: sentences.map((s) => `${s.jp} = ${s.en}`).join('\n'),
                      }),
                    });

                    const data = await response.json();
                    setAiResponse(data.message);
                  } catch (error) {
                    console.error('Error fetching AI response:', error);
                    setAiResponse('エラーが発生しました。少し待ってから再試行してください。');
                  } finally {
                    setIsAiLoading(false);
                  }
                }}
                disabled={isAiLoading || !aiQuestion.trim()}
                className={`flex-1 bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold py-3 rounded-xl transition-all ${isAiLoading || !aiQuestion.trim()
                  ? 'opacity-60 cursor-not-allowed'
                  : 'hover:from-green-600 hover:to-blue-600'
                  }`}
              >
                {isAiLoading ? '送信中...' : '質問を送信'}
              </button>
              <button
                onClick={() => setShowAIDialog(false)}
                className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition-all"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
