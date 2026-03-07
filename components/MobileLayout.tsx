'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useAppRouter } from '@/hooks/useAppRouter';
import { Capacitor } from '@capacitor/core';
import HardNavLink from './HardNavLink';
import { FixedAdBanner } from './ads/AdBanner';
import LifeIndicator from './life/LifeIndicator';
import BottomNav from './BottomNav';
import { useAuth } from '@/contexts/AuthContext';

interface MobileLayoutProps {
  children: ReactNode;
  showBottomNav?: boolean;
  showAds?: boolean;
  activeTab?: 'home' | 'study-log' | 'settings' | 'help';
  className?: string;
  requireAuth?: boolean; // 認証が必要なページかどうか
}

export default function MobileLayout({
  children,
  showBottomNav = true,
  showAds = true,
  activeTab,
  className = '',
  requireAuth = false,
}: MobileLayoutProps) {
  const [isNative, setIsNative] = useState(false);
  const router = useAppRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
  }, []);

  // 認証が必要なページで未認証の場合はトップページにリダイレクト
  useEffect(() => {
    if (requireAuth && !isLoading && !isAuthenticated) {
      router.replace('/');
    }
  }, [requireAuth, isAuthenticated, isLoading, router]);

  // 認証チェック中または未認証の場合はローディング表示
  if (requireAuth && (isLoading || !isAuthenticated)) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex flex-col max-w-[430px] mx-auto relative shadow-xl items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#FCC800] border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-gray-500 text-sm">読み込み中...</p>
      </div>
    );
  }

  // 広告表示時はナビゲーションバー + 広告の高さ分のパディングが必要
  const bottomPadding = showBottomNav ? (showAds ? 'pb-[140px]' : 'pb-20') : '';

  return (
    <div className={`min-h-screen bg-[#F5F7FA] flex flex-col max-w-[430px] mx-auto relative shadow-xl ${isNative ? 'capacitor-app' : ''} ${className}`}>
      {/* メインコンテンツ */}
      <div className={`flex-1 ${bottomPadding}`}>
        {children}
      </div>

      {/* 固定広告バナー（無料ユーザーのみ） */}
      {showBottomNav && showAds && <FixedAdBanner />}

      {/* Bottom Navigation Bar */}
      {showBottomNav && (
        <BottomNav
          currentPath={
            activeTab === 'home' ? '/home' :
            activeTab === 'study-log' ? '/study-log' :
            activeTab === 'settings' ? '/settings' :
            activeTab === 'help' ? '/help' :
            '/home'
          }
        />
      )}
    </div>
  );
}

// ページヘッダーコンポーネント
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backLink?: string;
  backLabel?: string;
  rightElement?: ReactNode;
  gradient?: string;
  showLife?: boolean; // ライフインジケーターを表示するか
  titleClassName?: string;
  subtitleClassName?: string;
  backLinkClassName?: string;
}

export function PageHeader({
  title,
  subtitle,
  backLink,
  backLabel = '戻る',
  rightElement,
  gradient = 'bg-white',
  showLife = false,
  titleClassName,
  subtitleClassName,
  backLinkClassName,
}: PageHeaderProps) {
  const resolvedBackLinkClassName = backLinkClassName ?? 'text-gray-600 hover:text-gray-800';
  const resolvedTitleClassName = titleClassName ?? 'text-gray-800';
  const resolvedSubtitleClassName = subtitleClassName ?? 'text-gray-500';

  return (
    <div className={`${gradient} px-4 py-4 sticky top-0 z-30`}>
      <div className="flex items-center justify-between">
        {backLink ? (
          <HardNavLink
            href={backLink}
            className={`${resolvedBackLinkClassName} font-semibold text-sm min-w-[60px]`}
          >
            ← {backLabel}
          </HardNavLink>
        ) : (
          <div className="min-w-[60px]" />
        )}
        <div className="text-center flex-1 px-2">
          <h1 className={`text-xl font-black truncate ${resolvedTitleClassName}`}>{title}</h1>
          {subtitle && (
            <p className={`text-xs mt-0.5 truncate ${resolvedSubtitleClassName}`}>{subtitle}</p>
          )}
        </div>
        {rightElement ? (
          rightElement
        ) : showLife ? (
          <div className="min-w-[60px] flex justify-end">
            <LifeIndicator variant="compact" />
          </div>
        ) : (
          <div className="min-w-[60px]" />
        )}
      </div>
    </div>
  );
}

// カードコンポーネント
interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  href?: string;
}

export function Card({ children, className = '', onClick, href }: CardProps) {
  const baseClass = `bg-white rounded-2xl shadow-md p-4 ${className}`;

  if (href) {
    return (
      <HardNavLink href={href} className={`block ${baseClass} active:scale-[0.98] transition-transform`}>
        {children}
      </HardNavLink>
    );
  }

  if (onClick) {
    return (
      <button onClick={onClick} className={`w-full text-left ${baseClass} active:scale-[0.98] transition-transform`}>
        {children}
      </button>
    );
  }

  return <div className={baseClass}>{children}</div>;
}

// モバイル向けボタンコンポーネント
interface MobileButtonProps {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  fullWidth?: boolean;
}

export function MobileButton({
  children,
  onClick,
  href,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  fullWidth = true,
}: MobileButtonProps) {
  const variantStyles = {
    primary: 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    danger: 'bg-gradient-to-r from-red-500 to-rose-500 text-white',
    success: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
  };

  const sizeStyles = {
    sm: 'py-2 px-4 text-sm min-h-[40px]',
    md: 'py-3 px-5 text-base min-h-[52px]',
    lg: 'py-4 px-6 text-lg min-h-[60px]',
  };

  const baseClass = `
    ${variantStyles[variant]}
    ${sizeStyles[size]}
    ${fullWidth ? 'w-full' : ''}
    font-bold rounded-xl
    transition-all duration-150
    active:scale-[0.98]
    disabled:opacity-50 disabled:cursor-not-allowed
    flex items-center justify-center gap-2
    ${className}
  `;

  if (href && !disabled) {
    return (
      <HardNavLink href={href} className={baseClass}>
        {children}
      </HardNavLink>
    );
  }

  return (
    <button onClick={onClick} disabled={disabled} className={baseClass}>
      {children}
    </button>
  );
}

// セクションタイトル
interface SectionTitleProps {
  children: ReactNode;
  icon?: ReactNode;
}

export function SectionTitle({ children, icon }: SectionTitleProps) {
  return (
    <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
      {icon && <span className="text-xl">{icon}</span>}
      {children}
    </h2>
  );
}
