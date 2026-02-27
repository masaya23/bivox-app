'use client';

import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';

interface ConfettiCelebrationProps {
  show: boolean;
  message?: string;
  subMessage?: string;
  showText?: boolean;
}

export default function ConfettiCelebration({
  show,
  message = 'GREAT!',
  subMessage,
  showText = true,
}: ConfettiCelebrationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [textVisible, setTextVisible] = useState(false);

  useEffect(() => {
    if (!show) {
      setTextVisible(false);
      return;
    }

    setTextVisible(showText);
  }, [show, showText]);

  useEffect(() => {
    if (!show) {
      return;
    }

    // canvas要素を取得してconfettiインスタンスを作成
    if (!canvasRef.current) return;

    let myConfetti: confetti.CreateTypes;
    try {
      myConfetti = confetti.create(canvasRef.current, {
        resize: true,
        useWorker: false,
      });
    } catch {
      // confetti初期化に失敗しても完了画面は表示する
      return;
    }

    // アプリのテーマカラー
    const colors = ['#06b6d4', '#ec4899', '#facc15', '#22c55e', '#8b5cf6', '#f97316'];

    // 左右から中央に向かって発射
    const fireConfetti = () => {
      try {
        // 左側から
        myConfetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors: colors,
          shapes: ['square', 'circle'],
          scalar: 1.2,
          drift: 0,
          gravity: 1.2,
        });

        // 右側から
        myConfetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          colors: colors,
          shapes: ['square', 'circle'],
          scalar: 1.2,
          drift: 0,
          gravity: 1.2,
        });

        // 中央上部から
        myConfetti({
          particleCount: 80,
          angle: 90,
          spread: 100,
          origin: { x: 0.5, y: 0.3 },
          colors: colors,
          shapes: ['square', 'circle'],
          scalar: 1.5,
          drift: 0,
          gravity: 1,
        });
      } catch {
        // confetti発射に失敗しても無視
      }
    };

    // 初回発射
    fireConfetti();

    // 0.3秒後に2回目
    const timer1 = setTimeout(() => {
      fireConfetti();
    }, 300);

    // 0.6秒後に3回目（少し控えめに）
    const timer2 = setTimeout(() => {
      try {
        myConfetti({
          particleCount: 30,
          angle: 90,
          spread: 120,
          origin: { x: 0.5, y: 0.4 },
          colors: colors,
          shapes: ['square', 'circle'],
          scalar: 1,
          gravity: 1.2,
        });
      } catch {
        // ignore
      }
    }, 600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      try { myConfetti.reset(); } catch { /* ignore */ }
    };
  }, [show]);

  if (!show) return null;

  return (
    <>
      {/* Confetti Canvas - コンテナ内に制限 */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-50"
      />

      {showText && (
        <div className="absolute top-12 left-0 w-full text-center pointer-events-none z-40">
          <div
            className={`
              transition-all duration-500 ease-out
              ${textVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}
            `}
          >
            <h1
              className="text-5xl font-black text-white animate-bounce"
              style={{
                textShadow: '0 2px 12px rgba(0,0,0,0.3)',
              }}
            >
              {message}
            </h1>
            {subMessage && (
              <p
                className={`
                  mt-3 text-lg font-bold text-white/90
                  transition-all duration-700 delay-300
                  ${textVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
                `}
              >
                {subMessage}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
