'use client';

import {
  useSubscription,
  TrainingMode,
  MODE_NAMES,
  MODE_REQUIRED_PLAN,
  PLAN_NAMES,
  PLAN_PRICES,
} from '@/contexts/SubscriptionContext';

// Material Design風SVGアイコン（白色）
function IconMic({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="white">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z" />
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
    </svg>
  );
}

function IconSmartToy({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="white">
      <path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zM7.5 11.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5S9.83 13 9 13s-1.5-.67-1.5-1.5zM16 17H8v-2h8v2zm-1-4c-.83 0-1.5-.67-1.5-1.5S14.17 10 15 10s1.5.67 1.5 1.5S15.83 13 15 13z" />
    </svg>
  );
}

function IconForum({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="white">
      <path d="M15 4v7H5.17L4 12.17V4h11m1-2H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1V3c0-.55-.45-1-1-1zm5 4h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1z" />
    </svg>
  );
}

function IconHeadphones({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="white">
      <path d="M12 3c-4.97 0-9 4.03-9 9v7c0 1.1.9 2 2 2h4v-8H5v-1c0-3.87 3.13-7 7-7s7 3.13 7 7v1h-4v8h4c1.1 0 2-.9 2-2v-7c0-4.97-4.03-9-9-9z" />
    </svg>
  );
}

function IconMenuBook({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="white">
      <path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.95 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z" />
    </svg>
  );
}

// モード別アイコンのマッピング
const MODE_ICON_RENDERERS: Record<TrainingMode, (size: number) => React.ReactNode> = {
  tutorial: (size) => <IconMenuBook size={size} />,
  shadowing: (size) => <IconHeadphones size={size} />,
  speaking: (size) => <IconMic size={size} />,
  'ai-drill': (size) => <IconSmartToy size={size} />,
  'ai-conversation': (size) => <IconForum size={size} />,
};

interface TeaserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  mode: TrainingMode;
}

export default function TeaserModal({
  isOpen,
  onClose,
  onUpgrade,
  mode,
}: TeaserModalProps) {
  const { tier } = useSubscription();

  if (!isOpen) return null;

  const requiredPlan = MODE_REQUIRED_PLAN[mode];
  const modeName = MODE_NAMES[mode];
  const planName = PLAN_NAMES[requiredPlan];
  const planPrice = PLAN_PRICES[requiredPlan];

  // モードに応じたカラー
  const modeStyles: Record<TrainingMode, { gradient: string; iconBg: string }> = {
    tutorial: { gradient: 'from-green-400 to-emerald-500', iconBg: 'bg-green-500' },
    shadowing: { gradient: 'from-green-400 to-teal-500', iconBg: 'bg-green-500' },
    speaking: { gradient: 'from-orange-400 to-amber-500', iconBg: 'bg-orange-500' },
    'ai-drill': { gradient: 'from-purple-400 to-pink-500', iconBg: 'bg-purple-500' },
    'ai-conversation': { gradient: 'from-purple-400 to-pink-500', iconBg: 'bg-purple-500' },
  };

  const style = modeStyles[mode];

  // 機能の特徴
  const modeFeatures: Record<TrainingMode, string[]> = {
    tutorial: ['基本操作を学ぶ', 'ステップバイステップ'],
    shadowing: ['音声を真似する', '発音の基礎を固める'],
    speaking: ['音声入力で自動判定', '発音精度をチェック', '実践的なトレーニング'],
    'ai-drill': ['AIが新問題を生成', '同じ文法レベルで応用', '間違えた問題を復習'],
    'ai-conversation': ['AIと自由に会話', 'リアルタイムフィードバック', '実践的な英会話力'],
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl shadow-2xl w-full max-w-[430px] overflow-hidden animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダーグラデーション */}
        <div className={`bg-gradient-to-r ${style.gradient} px-6 py-8 text-white text-center relative overflow-hidden`}>
          {/* 背景パターン（白い円でモダンに） */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-6 -left-6 w-32 h-32 bg-white rounded-full" />
            <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-white rounded-full" />
          </div>

          <div className="relative z-10">
            <div className={`w-20 h-20 ${style.iconBg} rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg`}>
              {MODE_ICON_RENDERERS[mode](48)}
            </div>
            <h2 className="text-2xl font-black mb-2">{modeName}</h2>
            <p className="text-white/90 text-sm">
              この機能は<span className="font-bold">{planName}</span>でご利用いただけます
            </p>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="px-6 py-6">
          {/* 機能の特徴 */}
          <div className="mb-6">
            <h3 className="font-bold text-gray-800 text-sm mb-3">この機能でできること</h3>
            <div className="space-y-2">
              {modeFeatures[mode].map((feature, index) => (
                <div key={index} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                  <span className="text-green-500 font-bold">✓</span>
                  <span className="text-gray-700 text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* プラン情報 */}
          <div className={`bg-gradient-to-r ${requiredPlan === 'pro' ? 'from-purple-50 to-pink-50 border-purple-200' : 'from-amber-50 to-orange-50 border-amber-200'} rounded-2xl p-4 mb-6 border`}>
            <div className="flex items-center justify-between">
              <div>
                <span className={`px-2 py-1 ${requiredPlan === 'pro' ? 'bg-purple-500' : 'bg-orange-500'} text-white text-xs font-bold rounded`}>
                  {planName}
                </span>
                <p className="text-xs text-gray-500 mt-2">月額</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-gray-800">
                  ¥{planPrice.toLocaleString()}
                </p>
                <p className="text-xs text-gray-400">/月</p>
              </div>
            </div>
          </div>

          {/* ボタン */}
          <div className="space-y-3">
            <button
              onClick={onUpgrade}
              className={`
                w-full py-4 rounded-2xl font-bold text-lg text-white
                bg-gradient-to-r ${style.gradient}
                active:scale-[0.98] transition-transform
                shadow-lg
              `}
            >
              詳しく見る →
            </button>

            <button
              onClick={onClose}
              className="w-full py-3 text-gray-500 font-semibold text-sm"
            >
              あとで
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

// 機能制限時に表示するロックオーバーレイ
interface FeatureLockedOverlayProps {
  mode: TrainingMode;
  onUnlockClick: () => void;
}

export function FeatureLockedOverlay({ mode, onUnlockClick }: FeatureLockedOverlayProps) {
  const requiredPlan = MODE_REQUIRED_PLAN[mode];
  const planName = PLAN_NAMES[requiredPlan];

  return (
    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center rounded-2xl z-10">
      <div className="text-center px-4">
        <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl mx-auto mb-3 flex items-center justify-center">
          {MODE_ICON_RENDERERS[mode](32)}
        </div>
        <p className="text-white font-bold mb-1">{planName}限定</p>
        <button
          onClick={onUnlockClick}
          className="mt-3 px-6 py-2 bg-white text-gray-800 rounded-full font-bold text-sm active:scale-[0.98] transition-transform"
        >
          詳しく見る
        </button>
      </div>
    </div>
  );
}
