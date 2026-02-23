'use client';

import { useSubscription } from '@/contexts/SubscriptionContext';

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
      {/* 実際のアプリではここにGoogle AdMob等のSDKを統合 */}
      <div className="flex flex-col items-center justify-center text-gray-400">
        <span className="text-xs font-medium">広告スペース</span>
        <span className="text-[10px]">Ad by Google AdMob</span>
      </div>
    </div>
  );
}

// 固定位置のバナー広告（画面下部に固定表示）
interface FixedAdBannerProps {
  className?: string;
}

export function FixedAdBanner({ className = '' }: FixedAdBannerProps) {
  const { shouldShowAds } = useSubscription();

  if (!shouldShowAds()) {
    return null;
  }

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
