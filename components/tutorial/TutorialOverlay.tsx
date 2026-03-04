'use client';

import { useState, useEffect, useCallback } from 'react';

// スポットライト対象の定義
export type SpotlightTarget = {
  id: string;
  label: string;
  description: string;
};

// チュートリアルステップの定義
export type TutorialStepConfig = {
  target: string | null; // スポットライト対象のID（nullの場合は全体が暗くなる）
  mascotSpeech: string;
  mascotExpression: 'happy' | 'excited' | 'thinking';
  buttonText?: string;
  autoAdvance?: boolean; // 対象をクリックしたら自動で次へ進むか
  hideNextButton?: boolean; // 次へボタンを非表示にするか
};

interface TutorialOverlayProps {
  isActive: boolean;
  currentStep: number;
  steps: TutorialStepConfig[];
  onStepComplete: () => void;
  onSkip: () => void;
  children?: React.ReactNode;
  mascotComponent?: React.ReactNode; // カスタムマスコットコンポーネント
  onTargetClick?: () => void; // スポットライト対象をクリックしたときのコールバック
}

// スポットライト穴の位置とサイズ
interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
  borderRadius: number;
}

export default function TutorialOverlay({
  isActive,
  currentStep,
  steps,
  onStepComplete,
  onSkip,
  mascotComponent,
  onTargetClick,
}: TutorialOverlayProps) {
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [speechComplete, setSpeechComplete] = useState(false);

  const currentConfig = steps[currentStep];

  // スポットライト対象の要素を検索して位置を取得
  const updateSpotlightPosition = useCallback(() => {
    if (!currentConfig?.target) {
      setSpotlightRect(null);
      return;
    }

    const targetElement = document.getElementById(currentConfig.target);
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      const padding = 8; // スポットライトの余白

      setSpotlightRect({
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
        borderRadius: 16,
      });

      // 対象要素のz-indexを上げる
      targetElement.style.position = 'relative';
      targetElement.style.zIndex = '100';
    }
  }, [currentConfig?.target]);

  // 対象要素にクリックイベントを追加
  useEffect(() => {
    if (!currentConfig?.target || !onTargetClick || !currentConfig.hideNextButton) {
      return;
    }

    const targetElement = document.getElementById(currentConfig.target);
    if (targetElement) {
      const handleClick = () => {
        onTargetClick();
      };
      targetElement.addEventListener('click', handleClick);
      targetElement.style.cursor = 'pointer';

      return () => {
        targetElement.removeEventListener('click', handleClick);
        targetElement.style.cursor = '';
      };
    }
  }, [currentConfig?.target, currentConfig?.hideNextButton, onTargetClick]);

  // オーバーレイの表示/非表示をアニメーション
  useEffect(() => {
    if (isActive) {
      // 少し遅延してフェードイン
      const timer = setTimeout(() => setIsVisible(true), 100);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isActive]);

  // スポットライト位置の更新
  useEffect(() => {
    if (isActive) {
      updateSpotlightPosition();

      // リサイズやスクロール時に位置を更新
      window.addEventListener('resize', updateSpotlightPosition);
      window.addEventListener('scroll', updateSpotlightPosition);

      return () => {
        window.removeEventListener('resize', updateSpotlightPosition);
        window.removeEventListener('scroll', updateSpotlightPosition);
      };
    }
  }, [isActive, currentStep, updateSpotlightPosition]);

  // 対象要素のz-indexをリセット
  useEffect(() => {
    return () => {
      if (currentConfig?.target) {
        const targetElement = document.getElementById(currentConfig.target);
        if (targetElement) {
          targetElement.style.zIndex = '';
          targetElement.style.position = '';
        }
      }
    };
  }, [currentConfig?.target]);

  // セリフ完了時の処理
  const handleSpeechComplete = useCallback(() => {
    setSpeechComplete(true);
  }, []);

  // 次のステップへ
  const handleNext = useCallback(() => {
    setSpeechComplete(false);
    onStepComplete();
  }, [onStepComplete]);

  // ステップ変更時にセリフ完了状態をリセット
  useEffect(() => {
    setSpeechComplete(false);
  }, [currentStep]);

  if (!isActive || !currentConfig) return null;

  // オーバーレイのスタイル（box-shadowで穴を開ける）
  const overlayStyle: React.CSSProperties = spotlightRect
    ? {
        boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.75)`,
        top: spotlightRect.top,
        left: spotlightRect.left,
        width: spotlightRect.width,
        height: spotlightRect.height,
        borderRadius: spotlightRect.borderRadius,
      }
    : {};

  return (
    <div
      className={`fixed inset-0 z-[90] transition-opacity duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* 暗いオーバーレイ（スポットライトなしの場合） */}
      {!spotlightRect && (
        <div className="absolute inset-0 bg-black/75 transition-opacity duration-300" />
      )}

      {/* スポットライト穴（対象がある場合） */}
      {spotlightRect && (
        <div
          className="absolute pointer-events-none transition-all duration-300 ease-out"
          style={overlayStyle}
        >
          {/* パルスアニメーション */}
          <div
            className="absolute inset-0 rounded-[inherit] animate-pulse"
            style={{
              boxShadow: '0 0 20px 4px rgba(255, 215, 0, 0.5)',
            }}
          />
        </div>
      )}

      {/* マスコット＋吹き出しエリア（スポットライト対象の下に配置） */}
      <div
        className="fixed left-0 right-0 max-w-[430px] mx-auto z-[100] px-4"
        style={{
          top: spotlightRect
            ? `${spotlightRect.top + spotlightRect.height + 12}px`
            : '50%',
        }}
      >
        <div className="flex items-start gap-3">
          {/* マスコット */}
          <div className="w-20 h-20 flex-shrink-0">
            {mascotComponent || <SpotlightMascot expression={currentConfig.mascotExpression} />}
          </div>

          {/* 吹き出し */}
          <div className="flex-1 mt-1">
            <SpotlightSpeechBubble
              text={currentConfig.mascotSpeech}
              isTyping={!speechComplete}
              onComplete={handleSpeechComplete}
            />
          </div>
        </div>
      </div>

      {/* スキップボタン（右上に固定） */}
      <button
        onClick={onSkip}
        className="fixed top-4 right-4 z-[100] px-4 py-2 bg-white/30 backdrop-blur-sm text-white text-sm font-bold rounded-full border-[1.5px] border-white hover:bg-white/40 transition-all"
      >
        スキップ
      </button>

      {/* 次へボタン（画面最下部に固定） */}
      {currentConfig.buttonText && speechComplete && !currentConfig.hideNextButton && (
        <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto z-[100]">
          <div className="px-4 pb-4 pt-2">
            <button
              onClick={handleNext}
              className="w-full py-3 bg-white text-gray-800 font-bold rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.2)] transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {currentConfig.buttonText}
            </button>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent -z-10 rounded-t-3xl" />
        </div>
      )}
    </div>
  );
}

// マスコットコンポーネント（SVG版）
function SpotlightMascot({
  expression = 'happy',
}: {
  expression: 'happy' | 'excited' | 'thinking';
}) {
  const expressionStyles = {
    happy: '',
    excited: '',
    thinking: 'scale-x-[-1]',
  };

  return (
    <div className={`w-full h-full ${expressionStyles[expression]}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
        {/* キツネの体 */}
        <ellipse cx="50" cy="70" rx="30" ry="25" fill="#FFD700" />
        {/* キツネの顔 */}
        <circle cx="50" cy="45" r="28" fill="#FFD700" />
        {/* 耳 */}
        <polygon points="25,30 35,5 45,30" fill="#FFD700" />
        <polygon points="55,30 65,5 75,30" fill="#FFD700" />
        <polygon points="28,28 35,10 42,28" fill="#FFF5CC" />
        <polygon points="58,28 65,10 72,28" fill="#FFF5CC" />
        {/* 顔の白い部分 */}
        <ellipse cx="50" cy="55" rx="18" ry="15" fill="#FFFEF0" />
        {/* 目 */}
        <ellipse cx="40" cy="42" rx="5" ry="6" fill="#333" />
        <ellipse cx="60" cy="42" rx="5" ry="6" fill="#333" />
        <circle cx="42" cy="40" r="2" fill="#FFF" />
        <circle cx="62" cy="40" r="2" fill="#FFF" />
        {/* 鼻 */}
        <ellipse cx="50" cy="52" rx="4" ry="3" fill="#333" />
        {/* 口 */}
        {expression === 'excited' ? (
          <path d="M 42 58 Q 50 66 58 58" stroke="#333" strokeWidth="2" fill="none" />
        ) : (
          <path d="M 45 58 Q 50 63 55 58" stroke="#333" strokeWidth="2" fill="none" />
        )}
        {/* ほっぺ */}
        <circle cx="32" cy="50" r="5" fill="#FFAA88" opacity="0.6" />
        <circle cx="68" cy="50" r="5" fill="#FFAA88" opacity="0.6" />
      </svg>
    </div>
  );
}

// 吹き出しコンポーネント（タイプライターエフェクト付き）
function SpotlightSpeechBubble({
  text,
  isTyping = true,
  onComplete,
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
    <div className="relative bg-white rounded-2xl p-4 shadow-lg border-2 border-gray-100">
      {/* 吹き出しのしっぽ（左向き - キツネの方向へ） */}
      <div
        className="absolute top-1/2 -left-3 -translate-y-1/2"
        style={{
          width: 0,
          height: 0,
          borderTop: '10px solid transparent',
          borderBottom: '10px solid transparent',
          borderRight: '14px solid white',
        }}
      />
      {/* しっぽの枠線（グレーボーダー用） */}
      <div
        className="absolute top-1/2 -left-[15px] -translate-y-1/2"
        style={{
          width: 0,
          height: 0,
          borderTop: '12px solid transparent',
          borderBottom: '12px solid transparent',
          borderRight: '16px solid #E5E7EB',
          zIndex: -1,
        }}
      />

      <p className="text-gray-800 text-sm leading-relaxed font-medium whitespace-pre-wrap">
        {displayedText}
        {!isComplete && <span className="animate-pulse">|</span>}
      </p>
    </div>
  );
}
