'use client';

import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useAppRouter } from '@/hooks/useAppRouter';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';

const isNative = (() => {
  try {
    return typeof window !== 'undefined' && Capacitor.isNativePlatform();
  } catch {
    return false;
  }
})();
import TeaserModal from '@/components/subscription/TeaserModal';
import PaywallScreen from '@/components/subscription/PaywallScreen';
import { FixedAdBanner } from '@/components/ads/AdBanner';
import BottomNav from '@/components/BottomNav';

// ========== デザイン定数 ==========
const DESIGN = {
  colors: {
    background: '#F5F7FA',
  },
  // ボタンカラー（フラット単色 + AI のみグラデーション）
  buttonColors: {
    juniorHigh1: '#1E90FF',  // Dodger Blue
    juniorHigh2: '#2ECC71',  // Emerald Green
    juniorHigh3: '#FF4757',  // Coral Red
    allGrades:   '#3949AB',  // Indigo 600 - マスター機能
    tutorial:    '#455A64',  // Blue Grey
  },
  // AIボタン：Proプランカードと統一（紫→ピンク）
  aiGradient: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
  aiShadow: '0 4px 12px rgba(168, 85, 247, 0.40)',
  button: {
    borderRadius: 'rounded-2xl',        // 16px
    minHeight: 'min-h-[64px]',
    padding: 'py-4 px-5',
    shadow: '0 4px 10px rgba(0,0,0,0.15)',
    shadowPressed: '0 2px 6px rgba(0,0,0,0.10)',
  },
  spacing: {
    buttonGap: 'gap-3',
    containerPadding: 'px-4 pt-5 pb-36',
  },
} as const;

// 統一ボタンコンポーネント（フラット単色 or グラデーション）
function MenuButton({
  href,
  children,
  color,
  bgStyle,
  shadowStyle,
  onClick,
  disabled = false,
}: {
  href?: string;
  children: React.ReactNode;
  color?: string;
  bgStyle?: string;
  shadowStyle?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    if (onClick) {
      e.preventDefault();
      onClick();
      return;
    }
    if (!href) return;
    if (e.defaultPrevented) return;
    if ('button' in e && e.button !== 0) return;
    if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    // Capacitor環境では.html拡張子を付与
    let targetHref = href;
    if (isNative && href !== '/' && !href.includes('.')) {
      const qIndex = href.indexOf('?');
      targetHref = qIndex !== -1
        ? href.substring(0, qIndex) + '.html' + href.substring(qIndex)
        : href + '.html';
    }
    window.location.assign(targetHref);
  };

  const buttonClasses = `
    block w-full ${DESIGN.button.borderRadius} ${DESIGN.button.minHeight} ${DESIGN.button.padding}
    text-white text-lg font-bold text-center
    flex items-center justify-center
    transition-all duration-150 ease-out active:scale-[0.98] active:opacity-90
    ${disabled ? 'opacity-60' : ''}
  `;

  const buttonStyle = {
    background: bgStyle || color,
    boxShadow: shadowStyle || DESIGN.button.shadow,
  };

  const content = (
    <div className="flex items-center justify-center gap-3">
      {children}
    </div>
  );

  if (onClick || !href) {
    return (
      <button
        onClick={handleClick}
        className={buttonClasses}
        style={buttonStyle}
        disabled={disabled}
      >
        {content}
      </button>
    );
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      className={buttonClasses}
      style={buttonStyle}
    >
      {content}
    </a>
  );
}

export default function HomePage() {
  const router = useAppRouter();
  const [showTeaser, setShowTeaser] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const { canAccessMode } = useSubscription();
  const { isAuthenticated, isLoading } = useAuth();

  const canAccessConversation = canAccessMode('ai-conversation');

  // 認証チェック
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, router]);

  // 認証チェック中はローディング表示
  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center max-w-[430px] mx-auto" style={{ backgroundColor: DESIGN.colors.background }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col max-w-[430px] mx-auto relative shadow-xl"
      style={{ backgroundColor: DESIGN.colors.background }}
    >
      {/* ヘッダー部分 - 左→右グラデーション */}
      <div
        className="relative px-6 pt-2 pb-0 overflow-hidden"
        style={{
          background: 'linear-gradient(to right, #FCC800, #FFD900)',
        }}
      >
        <div className="relative z-10 text-center">
          <img
            src="/images/bivox-logo.png"
            alt="Bivox"
            className="mx-auto w-[300px] sm:w-[320ppx] h-auto mb-1 drop-shadow-[0_1px_3px_rgba(0,0,0,0.20)]"
          />
          <h2
            className="text-[24px] font-bold text-white tracking-widest leading-tight"
            style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.15)' }}
          >
          </h2>
        </div>
      </div>

      {/* メインコンテンツ - スクロール可能エリア */}
      <div className={`flex-1 ${DESIGN.spacing.containerPadding} overflow-y-auto`}>
        {/* ボタン群（6つ） */}
        <div className={`flex flex-col ${DESIGN.spacing.buttonGap}`}>
          {/* 中学1年 */}
          <MenuButton href="/units?grade=junior-high-1" color={DESIGN.buttonColors.juniorHigh1}>
            <span className="text-lg">中学1年</span>
          </MenuButton>

          {/* 中学2年 */}
          <MenuButton href="/units?grade=junior-high-2" color={DESIGN.buttonColors.juniorHigh2}>
            <span className="text-lg">中学2年</span>
          </MenuButton>

          {/* 中学3年 */}
          <MenuButton href="/units?grade=junior-high-3" color={DESIGN.buttonColors.juniorHigh3}>
            <span className="text-lg">中学3年</span>
          </MenuButton>

          {/* 全学年 */}
          <MenuButton href="/units?grade=all" color={DESIGN.buttonColors.allGrades}>
            <span className="text-lg">全学年</span>
          </MenuButton>

          {/* AIと会話（ゴールドグラデーション） */}
          <div className="relative">
            {!canAccessConversation && (
              <div className="absolute -top-2 -right-2 z-20">
                <span className="px-2 py-1 bg-gray-800 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z"/></svg>
                  Proプラン
                </span>
              </div>
            )}
            <MenuButton
              href={canAccessConversation ? "/conversation" : undefined}
              onClick={canAccessConversation ? undefined : () => setShowTeaser(true)}
              bgStyle={DESIGN.aiGradient}
              shadowStyle={DESIGN.aiShadow}
            >
              <span className="text-lg">AIとフリー英会話</span>
            </MenuButton>
          </div>

          {/* チュートリアル */}
          <MenuButton href="/tutorial" color={DESIGN.buttonColors.tutorial}>
            <span className="text-lg">チュートリアル</span>
          </MenuButton>
        </div>

        {/* フッターメッセージ */}
        <div className="text-center py-4 mt-2">
          <p className="text-sm font-medium text-gray-400">
            毎日少しずつ、確実にレベルアップ
          </p>
        </div>
      </div>

      {/* バナー広告（Freeプランのみ表示） */}
      <FixedAdBanner />

      {/* Bottom Navigation Bar */}
      <BottomNav currentPath="/home" />

      {/* ティーザーモーダル */}
      <TeaserModal
        isOpen={showTeaser}
        onClose={() => setShowTeaser(false)}
        onUpgrade={() => {
          setShowTeaser(false);
          setShowPaywall(true);
        }}
        mode="ai-conversation"
      />

      {/* ペイウォール */}
      <PaywallScreen
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        highlightedMode="ai-conversation"
      />
    </div>
  );
}
