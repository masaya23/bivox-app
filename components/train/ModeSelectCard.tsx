'use client';

import { useState } from 'react';
import { useSubscription, TrainingMode, MODE_REQUIRED_PLAN, PLAN_NAMES } from '@/contexts/SubscriptionContext';
import TeaserModal from '@/components/subscription/TeaserModal';
import PaywallScreen from '@/components/subscription/PaywallScreen';
import HardNavLink from '@/components/HardNavLink';

interface ModeSelectCardProps {
  mode: TrainingMode;
  href: string;
  icon: string;
  iconBg: string;
  title: string;
  description: string;
  features: string[];
  gradient: string;
  borderColor: string;
  accentColor: string;
}

// スケルトンローダーコンポーネント
function ModeSelectCardSkeleton() {
  return (
    <div className="p-5 rounded-2xl border-2 border-gray-200 bg-gray-50 animate-pulse">
      <div className="flex items-start gap-3">
        {/* アイコン */}
        <div className="w-12 h-12 rounded-2xl bg-gray-200 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          {/* タイトル */}
          <div className="h-6 bg-gray-200 rounded w-32 mb-2" />
          {/* 説明 */}
          <div className="h-4 bg-gray-200 rounded w-48 mb-1" />
          <div className="h-4 bg-gray-200 rounded w-40 mb-3" />
          {/* 機能リスト */}
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-44" />
            <div className="h-3 bg-gray-200 rounded w-36" />
            <div className="h-3 bg-gray-200 rounded w-40" />
          </div>
        </div>
        {/* 矢印ボタン */}
        <div className="w-10 h-10 rounded-full bg-gray-200" />
      </div>
    </div>
  );
}

export default function ModeSelectCard({
  mode,
  href,
  icon,
  iconBg,
  title,
  description,
  features,
  gradient,
  borderColor,
  accentColor,
}: ModeSelectCardProps) {
  const { canAccessMode, isLoading } = useSubscription();
  const [showTeaser, setShowTeaser] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  // ローディング中はスケルトンを表示
  if (isLoading) {
    return <ModeSelectCardSkeleton />;
  }

  const hasAccess = canAccessMode(mode);
  const requiredPlan = MODE_REQUIRED_PLAN[mode];

  const handleClick = (e: React.MouseEvent) => {
    if (!hasAccess) {
      e.preventDefault();
      setShowTeaser(true);
    }
  };

  const handleUpgrade = () => {
    setShowTeaser(false);
    setShowPaywall(true);
  };

  return (
    <>
      <div className="relative">
        {/* ロックバッジ */}
        {!hasAccess && (
          <div className="absolute -top-2 -right-2 z-10">
            <span className="px-3 py-1.5 bg-gray-800 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1">
              <span>🔒</span>
              {PLAN_NAMES[requiredPlan]}
            </span>
          </div>
        )}

        <HardNavLink
          href={hasAccess ? href : '#'}
          onClick={handleClick}
          className={`
            block p-5 rounded-2xl border-2 transition-all
            ${gradient}
            ${hasAccess ? borderColor : 'border-gray-200'}
            ${hasAccess ? 'active:scale-[0.98] hover:shadow-lg' : 'opacity-70'}
          `}
        >
          <div className="relative flex items-start gap-3">
            <div className={`w-12 h-12 rounded-2xl ${iconBg} text-white font-bold text-lg flex items-center justify-center flex-shrink-0 shadow-md`}>
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 pr-10">
                <h2 className="text-lg font-black text-gray-800">
                  {title}
                </h2>
                {!hasAccess && (
                  <span className="text-gray-400">🔒</span>
                )}
              </div>
              <p className="text-gray-600 text-sm mb-3 whitespace-pre-line">
                {description.replace(/\\n/g, '\n')}
              </p>
              <div className="space-y-1.5">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-2 text-xs sm:text-sm text-gray-600">
                    <span className={`${accentColor} font-bold flex-shrink-0`}>✓</span>
                    <span className="whitespace-pre-line">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className={`absolute top-0 right-0 w-10 h-10 rounded-full ${hasAccess ? iconBg : 'bg-gray-200'} flex items-center justify-center text-white font-bold`}>
              {hasAccess ? '→' : '🔒'}
            </div>
          </div>
        </HardNavLink>
      </div>

      {/* ティーザーモーダル */}
      <TeaserModal
        isOpen={showTeaser}
        onClose={() => setShowTeaser(false)}
        onUpgrade={handleUpgrade}
        mode={mode}
      />

      {/* ペイウォール */}
      <PaywallScreen
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        highlightedMode={mode}
      />
    </>
  );
}
