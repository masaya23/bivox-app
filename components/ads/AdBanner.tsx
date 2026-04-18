'use client';

import { useEffect } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAd } from '@/contexts/AdContext';
import { Capacitor } from '@capacitor/core';
import { useAdMob } from '@/hooks/useAdMob';
import { usePathname } from 'next/navigation';

interface AdBannerProps {
  position?: 'top' | 'bottom' | 'inline';
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export default function AdBanner({
  position = 'bottom',
  size = 'medium',
  className = '',
}: AdBannerProps) {
  const { shouldShowAds } = useSubscription();

  // プレミアムユーザーには広告を表示しない
  if (!shouldShowAds()) {
    return null;
  }

  const sizeStyles = {
    small: 'h-[50px]',
    medium: 'h-[60px]',
    large: 'h-[90px]',
  };

  const positionStyles = {
    top: 'sticky top-0 z-20',
    bottom: 'sticky bottom-0 z-20',
    inline: '',
  };

  // Web環境ではプレースホルダーを表示
  if (!Capacitor.isNativePlatform()) {
    return (
      <div
        className={`
          w-full ${sizeStyles[size]} ${positionStyles[position]}
          bg-gradient-to-r from-gray-100 to-gray-200
          flex items-center justify-center
          border-y border-gray-200
          ${className}
        `}
      >
        <div className="flex flex-col items-center justify-center text-gray-400">
          <span className="text-xs font-medium">広告スペース</span>
          <span className="text-[10px]">Ad by Google AdMob</span>
        </div>
      </div>
    );
  }

  // ネイティブ環境ではAdMobバナーのスペーサーを表示
  // 実際のバナーはネイティブレイヤーで表示される
  return (
    <div
      className={`
        w-full ${sizeStyles[size]} ${positionStyles[position]}
        ${className}
      `}
    />
  );
}

// 固定位置のバナー広告（画面下部に固定表示）
// ネイティブではAdMobバナーを制御し、Webではプレースホルダーを表示
interface FixedAdBannerProps {
  className?: string;
  visible?: boolean;
}

export function FixedAdBanner({ className = '', visible = true }: FixedAdBannerProps) {
  const { shouldShowAds } = useSubscription();
  const { isBannerHidden } = useAd();
  const { showBanner, hideBanner, isNative, isInitialized } = useAdMob();
  const pathname = usePathname();

  const showAds = visible && shouldShowAds() && !isBannerHidden;

  // ネイティブ環境：ページ復帰時も含めて毎回BottomNav上に再配置する
  useEffect(() => {
    if (!isNative || !isInitialized) return;

    if (showAds) {
      void showBanner('BOTTOM');
    } else {
      void hideBanner();
    }

    return () => {
      void hideBanner();
    };
  }, [showAds, isNative, isInitialized, pathname, showBanner, hideBanner]);

  if (!showAds) {
    return null;
  }

  // ネイティブ環境：ネイティブバナー分のスペーサーのみ表示
  if (isNative) {
    return (
      <div
        className={`
          fixed bottom-[68px] left-0 right-0 z-30
          ${className}
        `}
      >
        <div className="max-w-[430px] mx-auto">
          <div className="h-[50px]" />
        </div>
      </div>
    );
  }

  // Web環境：プレースホルダーを表示
  return (
    <div
      className={`
        fixed bottom-[68px] left-0 right-0 z-30
        ${className}
      `}
    >
      <div className="max-w-[430px] mx-auto">
        <div className="h-[50px] bg-gradient-to-r from-gray-100 to-gray-200 flex items-center justify-center border-t border-gray-200 shadow-sm">
          <div className="flex flex-col items-center justify-center text-gray-400">
            <span className="text-xs font-medium">広告スペース</span>
            <span className="text-[10px]">Ad by Google AdMob</span>
          </div>
        </div>
      </div>
    </div>
  );
}
