'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppRouter } from '@/hooks/useAppRouter';
import Image from 'next/image';
import TutorialOverlay, { TutorialStepConfig } from '@/components/tutorial/TutorialOverlay';

// チュートリアル完了を記録
const completeTutorial = () => {
  localStorage.setItem('tutorial_completed', 'true');
  localStorage.setItem('tutorial_completed_at', new Date().toISOString());
};

// ローカルMP3ファイルで音声を再生
let tutorialAudio: HTMLAudioElement | null = null;
const speakText = (_text: string, lang: 'ja-JP' | 'en-US') => {
  if (typeof window === 'undefined') return;

  // 既存の再生を停止
  if (tutorialAudio) {
    tutorialAudio.pause();
    tutorialAudio = null;
  }

  // チュートリアルで使う固定文のMP3 (unit1-p1-s1: "I am a student." / "私は学生です。")
  const audioLang = lang === 'ja-JP' ? 'ja' : 'en';
  const audio = new Audio(`/audio/${audioLang}/unit1-p1-s1.mp3`);
  tutorialAudio = audio;
  audio.play().catch(() => {});
};

// チュートリアルのフェーズ
type TutorialPhase = 'intro' | 'ready' | 'japanese' | 'pause' | 'english' | 'finish';

// フェーズごとのマスコット画像パス
const MASCOT_IMAGES: Record<TutorialPhase, string> = {
  intro: '/images/mascot/fox_intro.png',
  ready: '/images/mascot/fox_try.png',
  japanese: '/images/mascot/fox_try.png',
  pause: '/images/mascot/fox_practice.png',
  english: '/images/mascot/fox_practice.png',
  finish: '/images/mascot/fox_finish.png',
};

const MASCOT_FALLBACK = '/images/mascot/fox_basic.png';

// マスコットコンポーネント
function FoxMascot({
  expression = 'happy',
  className = '',
  phase
}: {
  expression?: 'happy' | 'excited' | 'thinking';
  className?: string;
  phase?: TutorialPhase;
}) {
  const [imageError, setImageError] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  const imageSrc = phase && !useFallback
    ? MASCOT_IMAGES[phase]
    : MASCOT_FALLBACK;

  const expressionStyles = {
    happy: '',
    excited: '',
    thinking: 'scale-x-[-1]'
  };

  useEffect(() => {
    setImageError(false);
    setUseFallback(false);
  }, [phase]);

  if (imageError) {
    return (
      <div className={`${className} ${expressionStyles[expression]}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
          <ellipse cx="50" cy="70" rx="30" ry="25" fill="#FFD700" />
          <circle cx="50" cy="45" r="28" fill="#FFD700" />
          <polygon points="25,30 35,5 45,30" fill="#FFD700" />
          <polygon points="55,30 65,5 75,30" fill="#FFD700" />
          <polygon points="28,28 35,10 42,28" fill="#FFF5CC" />
          <polygon points="58,28 65,10 72,28" fill="#FFF5CC" />
          <ellipse cx="50" cy="55" rx="18" ry="15" fill="#FFFEF0" />
          <ellipse cx="40" cy="42" rx="5" ry="6" fill="#333" />
          <ellipse cx="60" cy="42" rx="5" ry="6" fill="#333" />
          <circle cx="42" cy="40" r="2" fill="#FFF" />
          <circle cx="62" cy="40" r="2" fill="#FFF" />
          <ellipse cx="50" cy="52" rx="4" ry="3" fill="#333" />
          <path d="M 45 58 Q 50 63 55 58" stroke="#333" strokeWidth="2" fill="none" />
          <circle cx="32" cy="50" r="5" fill="#FFAA88" opacity="0.6" />
          <circle cx="68" cy="50" r="5" fill="#FFAA88" opacity="0.6" />
        </svg>
      </div>
    );
  }

  return (
    <div className={`${className} ${expressionStyles[expression]}`}>
      <Image
        src={imageSrc}
        alt="Vox - マスコットキャラクター"
        width={120}
        height={120}
        className="drop-shadow-lg"
        onError={() => {
          if (phase && !useFallback) {
            setUseFallback(true);
          } else {
            setImageError(true);
          }
        }}
      />
    </div>
  );
}

// 吹き出しコンポーネント
function SpeechBubble({
  text,
  isTyping = true,
  onComplete
}: {
  text: string;
  isTyping?: boolean;
  onComplete?: () => void;
}) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!isTyping) {
      setDisplayedText(text);
      setIsComplete(true);
      onComplete?.();
      return;
    }

    setDisplayedText('');
    setIsComplete(false);
    let index = 0;

    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
        setIsComplete(true);
        onComplete?.();
      }
    }, 40);

    return () => clearInterval(timer);
  }, [text, isTyping, onComplete]);

  return (
    <div className="relative bg-white rounded-2xl p-4 shadow-lg border-2 border-gray-100 max-w-[280px]">
      <div className="absolute -bottom-3 left-8 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[14px] border-t-white" />
      <div className="absolute -bottom-[10px] left-[34px] w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[12px] border-t-white" />
      <p className="text-gray-800 text-sm leading-relaxed font-medium whitespace-pre-wrap">
        {displayedText}
        {!isComplete && <span className="animate-pulse">|</span>}
      </p>
    </div>
  );
}

// 紙吹雪コンポーネント
function Confetti() {
  const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {Array.from({ length: 50 }).map((_, i) => (
        <div
          key={i}
          className="absolute animate-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            top: '-20px',
            width: `${Math.random() * 10 + 5}px`,
            height: `${Math.random() * 10 + 5}px`,
            backgroundColor: colors[Math.floor(Math.random() * colors.length)],
            borderRadius: Math.random() > 0.5 ? '50%' : '0%',
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${Math.random() * 2 + 2}s`,
          }}
        />
      ))}
    </div>
  );
}

// スポットライトステップ定義
const SPOTLIGHT_STEPS: TutorialStepConfig[] = [
  {
    target: 'play-button',
    mascotSpeech: '「練習開始」ボタンを押すと\n自動で問題が進んでいくよ！\n実際に押してみて！',
    mascotExpression: 'excited',
    buttonText: '次へ →',
    hideNextButton: true, // 練習開始ボタンをクリックで進むので非表示
  },
  {
    target: 'sentence-display',
    mascotSpeech: '日本語が表示されて\n音声が流れるよ！',
    mascotExpression: 'happy',
    buttonText: '次へ →',
  },
  {
    target: 'sentence-display',
    mascotSpeech: 'ポーズの間に\n英語を声に出してみよう！',
    mascotExpression: 'excited',
    buttonText: '次へ →',
  },
  {
    target: 'sentence-display',
    mascotSpeech: '最後に正解の英語が流れるよ、自分で言った言葉が合っていたか確認！\n繰り返し練習しよう！',
    mascotExpression: 'happy',
    buttonText: 'わかった！',
  },
];

// モックベーシックモードのUI
function MockBasicModeUI({
  displayState,
}: {
  displayState: 'idle' | 'japanese' | 'pause' | 'english';
}) {
  const sentence = { jp: '私は学生です。', en: 'I am a student.', level: 'A1', tags: ['be動詞'] };

  return (
    <div className="min-h-screen bg-gray-200 flex justify-center">
      <div className="w-full max-w-[430px] min-h-screen bg-gray-50 shadow-xl flex flex-col relative">
        {/* ヘッダー */}
        <header className="bg-white px-4 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 font-semibold text-sm min-w-[50px]">
              ← 戻る
            </span>
            <div className="text-center flex-1 px-2">
              <span className="px-3 py-1 text-xs font-bold text-white bg-blue-500 rounded-full">
                Part 1
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-red-500 text-sm">❤️ 5</span>
              <span className="text-gray-400">⚙️</span>
            </div>
          </div>
        </header>

        {/* メインコンテンツ */}
        <main className="flex-1 flex flex-col p-4">
          {/* 進捗バー */}
          <div className="mb-4 space-y-1">
            <div className="text-center text-xs font-semibold text-gray-500 tabular-nums">
              1 / 10
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full"
                style={{ width: '10%' }}
              />
            </div>
          </div>

          {/* カード */}
          <div className="flex-1 bg-white rounded-2xl shadow-md p-4 flex flex-col">
            {/* レベルとタグ */}
            <div className="flex gap-1.5 mb-4 flex-wrap">
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded font-semibold">
                {sentence.level}
              </span>
              {sentence.tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                  {tag}
                </span>
              ))}
            </div>

            {/* 状態表示エリア */}
            <div
              id="status-area"
              className="flex-1 flex flex-col justify-center min-h-[200px]"
            >
              {displayState === 'idle' && (
                <>
                  <p className="text-xs text-gray-500 mb-2 text-center">
                    日本語を聞いて、英語で答えてください
                  </p>
                  <h2 className="text-2xl font-bold text-gray-800 text-center">
                    準備完了
                  </h2>
                </>
              )}

              {displayState === 'japanese' && (
                <div id="sentence-display" className="text-center">
                  <div className="text-sm mb-2 font-black text-blue-700">JP</div>
                  <p className="text-xs text-blue-600 mb-2 font-semibold">
                    日本語を聞いています...
                  </p>
                  <h2 className="text-3xl font-bold text-gray-800">
                    {sentence.jp}
                  </h2>
                </div>
              )}

              {displayState === 'pause' && (
                <div id="sentence-display" className="text-center">
                  <div className="text-sm mb-2 font-black text-orange-700">PAUSE</div>
                  <p className="text-xs text-orange-600 mb-2 font-semibold">
                    あなたの番！英語で話してください
                  </p>
                  <h2 className="text-3xl font-bold text-gray-800">
                    {sentence.jp}
                  </h2>
                </div>
              )}

              {displayState === 'english' && (
                <div id="sentence-display" className="text-center">
                  <div className="text-sm mb-2 font-black text-green-700">EN</div>
                  <p className="text-xs text-green-600 mb-2 font-semibold">
                    正解の英語を確認しましょう
                  </p>
                  <h2 className="text-3xl font-bold text-gray-800">
                    {sentence.en}
                  </h2>
                </div>
              )}
            </div>

            {/* コントロールボタン */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                id="play-button"
                className={`col-span-2 py-3 rounded-xl text-white font-bold text-base ${
                  displayState === 'idle'
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500'
                    : 'bg-gray-400'
                }`}
              >
                {displayState === 'idle' ? '練習開始' : '停止'}
              </button>

              <button
                className="py-3 rounded-xl font-bold text-sm bg-gray-100 text-gray-400"
                disabled
              >
                ← 前の問題
              </button>

              <button
                className="py-3 rounded-xl font-bold text-sm bg-white border-2 border-gray-200 text-gray-700"
              >
                次の問題 →
              </button>

              <button
                className="col-span-2 py-3 rounded-xl font-bold text-sm bg-red-500 text-white"
              >
                練習を終了
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function TutorialPage() {
  const router = useAppRouter();
  const [phase, setPhase] = useState<TutorialPhase>('intro');
  const [introStep, setIntroStep] = useState(0);
  const [spotlightStep, setSpotlightStep] = useState(0);
  const [mascotExpression, setMascotExpression] = useState<'happy' | 'excited' | 'thinking'>('happy');
  const [speechComplete, setSpeechComplete] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [mockDisplayState, setMockDisplayState] = useState<'idle' | 'japanese' | 'pause' | 'english'>('idle');

  // スキップ処理
  const handleSkip = useCallback(() => {
    completeTutorial();
    router.push('/home');
  }, [router]);

  // イントロの次へ
  const handleIntroNext = useCallback(() => {
    setSpeechComplete(false);
    if (introStep === 0) {
      setIntroStep(1);
    } else {
      // ベーシックモードUI表示フェーズへ
      setPhase('ready');
    }
  }, [introStep]);

  // 練習開始ボタンがクリックされた時（最初のステップ用）
  const handlePlayButtonClick = useCallback(() => {
    if (spotlightStep === 0) {
      setSpeechComplete(false);
      // 練習開始ボタンクリック → JP表示 + 日本語音声再生
      setMockDisplayState('japanese');
      setSpotlightStep(1);
      // 少し遅延して音声再生（画面遷移後に再生）
      setTimeout(() => {
        speakText('私は学生です', 'ja-JP');
      }, 500);
    }
  }, [spotlightStep]);

  // スポットライトステップ完了
  const handleSpotlightStepComplete = useCallback(() => {
    setSpeechComplete(false);

    if (spotlightStep === 0) {
      // 練習開始ボタン説明後 → JP表示 + 日本語音声再生
      setMockDisplayState('japanese');
      setSpotlightStep(1);
      setTimeout(() => {
        speakText('私は学生です', 'ja-JP');
      }, 500);
    } else if (spotlightStep === 1) {
      // JP説明後 → PAUSE表示
      setMockDisplayState('pause');
      setSpotlightStep(2);
    } else if (spotlightStep === 2) {
      // PAUSE説明後 → EN表示 + 英語音声再生
      setMockDisplayState('english');
      setSpotlightStep(3);
      setTimeout(() => {
        speakText('I am a student.', 'en-US');
      }, 500);
    } else {
      // 完了フェーズへ
      setPhase('finish');
      setMascotExpression('excited');
      setShowConfetti(true);
    }
  }, [spotlightStep]);

  // 完了処理
  const handleFinish = useCallback(() => {
    completeTutorial();
    router.push('/home');
  }, [router]);

  // イントロのセリフ
  const getIntroSpeech = () => {
    if (introStep === 0) {
      return 'はじめまして！ボクはこのアプリのナビゲーター、Vox（ボックス）だよ！\nチュートリアルではベーシックモードの使い方をサポートするね！';
    }
    return 'ベーシックモードの流れはこうだよ！\n日本語を聞く→ポーズの間に英語を話す→正解を聞いて合っているか確認！\nこれを繰り返して英語脳を作ろう！';
  };

  // フェーズごとのマスコット表現を取得
  const getMascotExpression = (): 'happy' | 'excited' | 'thinking' => {
    if (phase === 'intro') return 'happy';
    if (phase === 'ready') return 'excited';
    if (phase === 'finish') return 'excited';
    return mascotExpression;
  };

  // イントロフェーズの表示
  if (phase === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FCC800] via-[#FFD900] to-[#FFF2B0] flex flex-col max-w-[430px] mx-auto relative shadow-xl overflow-hidden">
        {/* スキップボタン */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 z-50 px-4 py-2 bg-white/30 backdrop-blur-sm text-white text-sm font-bold rounded-full border-[1.5px] border-white hover:bg-white/40 transition-all"
        >
          スキップ
        </button>

        {/* メインコンテンツエリア */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-48">
          {/* Grid: 両カードを同じセルに重ね、背の高い方で高さを確保 → 上端が揃う */}
          <div className="w-full max-w-sm grid">
            <div className={`col-start-1 row-start-1 transition-opacity duration-300 ${introStep === 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <div className="bg-white rounded-3xl shadow-2xl p-6 w-full animate-fadeIn">
                {/* ヘッダー：アイコン + タイトル */}
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-[#1E90FF] rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-[0_4px_10px_rgba(30,144,255,0.3)]">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422A12 12 0 0112 21a12 12 0 01-6.16-10.422L12 14z" /></svg>
                  </div>
                  <h2 className="text-xl font-black text-gray-800">Bivoxへようこそ！</h2>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                    <span className="text-3xl">🎯</span>
                    <span className="text-base text-gray-800 font-bold leading-relaxed">中学英語をマスター</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                    <span className="text-3xl">🔊</span>
                    <span className="text-base text-gray-800 font-bold leading-relaxed">音声で聞いて、声に出す</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
                    <span className="text-3xl">🔄</span>
                    <span className="text-base text-gray-800 font-bold leading-relaxed">繰り返しで英語脳を作る</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={`col-start-1 row-start-1 transition-opacity duration-300 ${introStep === 1 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <div className="bg-white rounded-3xl shadow-2xl p-6 w-full animate-fadeIn">
                <h2 className="text-xl font-black text-gray-800 text-center mb-6">ベーシックモードの流れ</h2>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-[#1E90FF] rounded-2xl flex items-center justify-center shadow-[0_4px_10px_rgba(30,144,255,0.3)]">
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M11 5L6 9H2v6h4l5 4V5z" /></svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-800 leading-relaxed">日本語を聞く</p>
                      <p className="text-xs text-gray-500 leading-relaxed">音声と画面で確認</p>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <div className="text-2xl text-gray-300">↓</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-[#FF4757] rounded-2xl flex items-center justify-center shadow-[0_4px_10px_rgba(255,71,87,0.3)]">
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="11" rx="3" /><path d="M5 10a7 7 0 0014 0" /><path d="M12 17v4" /><path d="M8 21h8" /></svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-800 leading-relaxed">英語を話す</p>
                      <p className="text-xs text-gray-500 leading-relaxed">ポーズの間に声に出そう</p>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <div className="text-2xl text-gray-300">↓</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-[#2ECC71] rounded-2xl flex items-center justify-center shadow-[0_4px_10px_rgba(46,204,113,0.3)]">
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-800 leading-relaxed">正解を聞く</p>
                      <p className="text-xs text-gray-500 leading-relaxed">英語音声で答え合わせ</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* マスコット＆吹き出しエリア */}
        <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto z-40">
          <div className="px-4 pb-4">
            <div className="mb-2 ml-3">
              <SpeechBubble
                text={getIntroSpeech()}
                isTyping={!speechComplete}
                onComplete={() => setSpeechComplete(true)}
              />
            </div>

            <div className="flex items-end gap-4">
              <div className="w-24 h-24 flex-shrink-0">
                <FoxMascot expression="happy" className="w-full h-full" phase="intro" />
              </div>

              <div className="flex-1 pb-2">
                {speechComplete && (
                  <button
                    onClick={handleIntroNext}
                    className="w-full py-3 bg-white text-gray-800 font-bold rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.2)] transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {introStep === 0 ? '次へ →' : 'わかった！'}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/95 to-transparent -z-10 rounded-t-3xl" />
        </div>

        <style jsx global>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fadeIn { animation: fadeIn 0.5s ease-out; }
        `}</style>
      </div>
    );
  }

  // ベーシックモードUI表示フェーズ（ready, japanese, pause, english）
  if (phase === 'ready' || phase === 'japanese' || phase === 'pause' || phase === 'english') {
    return (
      <div className="relative">
        {/* 実際のベーシックモードUIを模倣 */}
        <MockBasicModeUI displayState={mockDisplayState} />

        {/* スポットライトオーバーレイ */}
        <TutorialOverlay
          isActive={true}
          currentStep={spotlightStep}
          steps={SPOTLIGHT_STEPS}
          onStepComplete={handleSpotlightStepComplete}
          onSkip={handleSkip}
          onTargetClick={handlePlayButtonClick}
          mascotComponent={
            <FoxMascot
              expression={SPOTLIGHT_STEPS[spotlightStep]?.mascotExpression || 'happy'}
              className="w-full h-full"
              phase={phase}
            />
          }
        />
      </div>
    );
  }

  // 完了フェーズ
  if (phase === 'finish') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FCC800] via-[#FFD900] to-[#FFF2B0] flex flex-col max-w-[430px] mx-auto relative shadow-xl overflow-hidden">
        {showConfetti && <Confetti />}

        <div className="flex-1 flex flex-col items-center justify-center px-4 pt-16 pb-48">
          <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm animate-fadeIn">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-black text-gray-800 mb-2">チュートリアル完了！</h2>
              <p className="text-gray-600 text-sm">
                準備は整ったよ！<br />
                さっそくトレーニングを始めよう！
              </p>
            </div>

            <div className="bg-gradient-to-r from-[#FFF7CC] to-[#FFE8A0] rounded-xl p-4 border border-yellow-200">
              <div className="flex items-start gap-3">
                <span className="text-xl">💡</span>
                <p className="text-sm text-gray-700">
                  毎日少しずつ続けることが上達のコツ！
                  間違えても気にしないで、どんどん挑戦しよう！
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* マスコット＆吹き出しエリア */}
        <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto z-40">
          <div className="px-4 pb-4">
            <div className="mb-2 ml-3">
              <SpeechBubble
                text="完璧だね！間違えても大丈夫、毎日続けることが大事だよ。さあ、ホーム画面に戻って実際のトレーニングを始めよう！"
                isTyping={!speechComplete}
                onComplete={() => setSpeechComplete(true)}
              />
            </div>

            <div className="flex items-end gap-4">
              <div className="w-24 h-24 flex-shrink-0">
                <FoxMascot expression="excited" className="w-full h-full" phase="finish" />
              </div>

              <div className="flex-1 pb-2">
                {speechComplete && (
                  <button
                    onClick={handleFinish}
                    className="w-full py-3 bg-white text-gray-800 font-bold rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.2)] transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    スタート！
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/95 to-transparent -z-10 rounded-t-3xl" />
        </div>

        <style jsx global>{`
          @keyframes confetti {
            0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
          }
          .animate-confetti { animation: confetti 3s ease-out forwards; }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fadeIn { animation: fadeIn 0.5s ease-out; }
        `}</style>
      </div>
    );
  }

  return null;
}
