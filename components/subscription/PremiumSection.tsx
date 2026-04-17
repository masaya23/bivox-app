'use client';

import { useState } from 'react';
import {
  useSubscription,
  PLAN_NAMES,
  PLAN_PRICES,
  ANNUAL_PLAN_PRICES,
} from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAppRouter } from '@/hooks/useAppRouter';
import { isGuestUser } from '@/utils/guestAccess';
import type { SubscriptionTier } from '@/contexts/SubscriptionContext';
import PaywallScreen from './PaywallScreen';

// プラン別テーマカラー定義
const PLAN_THEMES: Record<SubscriptionTier, {
  cardBg: string;
  border: string;
  badgeBg: string;
  badgeText: string;
  priceText: string;
  labelText: string;
  itemText: string;
  checkColor: string;
  btnBg: string;
  btnText: string;
  btnBorder: string;
}> = {
  pro: {
    cardBg: 'bg-[#F3E5F5]',
    border: 'border-[#CE93D8]/40',
    badgeBg: 'bg-gradient-to-r from-[#7B1FA2] to-[#9C27B0]',
    badgeText: 'text-white',
    priceText: 'text-[#6A1B9A]',
    labelText: 'text-[#8E6B99]',
    itemText: 'text-[#4A148C]',
    checkColor: 'text-[#AB47BC]',
    btnBg: 'bg-white/60 backdrop-blur-sm',
    btnText: 'text-[#6A1B9A]',
    btnBorder: 'border-[#6A1B9A]/15',
  },
  plus: {
    cardBg: 'bg-[#FFF3E0]',
    border: 'border-[#FFCC80]/40',
    badgeBg: 'bg-gradient-to-r from-[#E65100] to-[#F57C00]',
    badgeText: 'text-white',
    priceText: 'text-[#E65100]',
    labelText: 'text-[#A1887F]',
    itemText: 'text-[#BF360C]',
    checkColor: 'text-[#FB8C00]',
    btnBg: 'bg-white/60 backdrop-blur-sm',
    btnText: 'text-[#E65100]',
    btnBorder: 'border-[#E65100]/15',
  },
  free: {
    cardBg: 'bg-white',
    border: 'border-gray-200',
    badgeBg: 'bg-gray-500',
    badgeText: 'text-white',
    priceText: 'text-gray-800',
    labelText: 'text-gray-500',
    itemText: 'text-gray-600',
    checkColor: 'text-[#FCC800]',
    btnBg: 'bg-[#3E2723]',
    btnText: 'text-white',
    btnBorder: 'border-transparent',
  },
};

// プラン別アイコン
function PlanIcon({ tier }: { tier: SubscriptionTier }) {
  if (tier === 'pro') {
    // 王冠アイコン
    return (
      <svg className="w-5 h-5 text-[#7B1FA2]" fill="currentColor" viewBox="0 0 24 24">
        <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
      </svg>
    );
  }
  if (tier === 'plus') {
    // 星アイコン
    return (
      <svg className="w-5 h-5 text-[#E65100]" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    );
  }
  return null;
}

export default function PremiumSection() {
  const router = useAppRouter();
  const { user } = useAuth();
  const { expiresAt, isPremium, billingPeriod, getEffectiveTier } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);
  const isGuest = isGuestUser(user);
  const effectiveTier = getEffectiveTier();
  const effectiveBillingPeriod = effectiveTier === 'free' ? null : billingPeriod;
  const isPremiumUser = effectiveTier !== 'free' && isPremium();

  const theme = PLAN_THEMES[effectiveTier];

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getDisplayPrice = () => {
    if (effectiveBillingPeriod === 'annual') {
      return ANNUAL_PLAN_PRICES[effectiveTier];
    }
    return PLAN_PRICES[effectiveTier];
  };

  const getPriceLabel = () => {
    if (effectiveBillingPeriod === 'annual') {
      return '/年';
    }
    return '/月';
  };

  return (
    <>
      {isPremiumUser ? (
        /* ─── プレミアムユーザー向け会員証カード ─── */
        <div className={`rounded-2xl overflow-hidden ${theme.cardBg} ${theme.border} border shadow-sm`}>
          <div className="px-5 pt-5 pb-4">
            {/* 上部: アイコン + プラン名 + 価格 */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <PlanIcon tier={effectiveTier} />
                  <p className={`text-xs ${theme.labelText} font-medium`}>現在のプラン</p>
                </div>
                <span className={`inline-block px-3 py-1 ${theme.badgeBg} ${theme.badgeText} text-xs font-bold rounded-full`}>
                  {PLAN_NAMES[effectiveTier]}
                </span>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-black ${theme.priceText}`}>
                  ¥{getDisplayPrice().toLocaleString()}
                </p>
                <p className={`text-xs ${theme.labelText}`}>
                  {getPriceLabel()}
                  {effectiveBillingPeriod === 'annual' && (
                    <span className="ml-1">(月額 ¥{Math.round(ANNUAL_PLAN_PRICES[effectiveTier] / 12).toLocaleString()})</span>
                  )}
                </p>
              </div>
            </div>

            {/* 更新日 */}
            {expiresAt && (
              <p className={`text-xs ${theme.labelText} mb-3`}>
                次回更新日: {formatDate(expiresAt)}
              </p>
            )}

            {/* 特典リスト */}
            <div className="space-y-1.5 mb-4">
              <div className={`flex items-center gap-2 text-sm ${theme.itemText}`}>
                <svg className={`w-4 h-4 ${theme.checkColor} shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                広告非表示
              </div>
              <div className={`flex items-center gap-2 text-sm ${theme.itemText}`}>
                <svg className={`w-4 h-4 ${theme.checkColor} shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                {effectiveTier === 'plus' ? 'スピーキングモード利用可能' : '全モード利用可能'}
              </div>
              {effectiveTier === 'pro' && (
                <div className={`flex items-center gap-2 text-sm ${theme.itemText}`}>
                  <svg className={`w-4 h-4 ${theme.checkColor} shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  AI機能利用可能
                </div>
              )}
            </div>

            {/* プラン変更ボタン */}
            <button
              onClick={() => setShowPaywall(true)}
              className={`w-full py-2.5 ${theme.btnBg} ${theme.btnText} rounded-xl font-semibold text-sm active:scale-[0.98] transition-all border ${theme.btnBorder}`}
            >
              プラン変更
            </button>
          </div>
        </div>
      ) : (
        /* ─── 無料ユーザー向けアップグレード誘導 ─── */
        <div className="rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-sm">
          <div className="px-5 pt-5 pb-4">
            <div className="text-center mb-4">
              <p className="text-xs text-gray-400 mb-1">現在のプラン</p>
              <span className="inline-block px-3 py-1 bg-gray-100 text-gray-500 text-xs font-bold rounded-full mb-3">
                {isGuest ? 'ゲスト利用中' : 'フリープラン'}
              </span>
              <p className="text-base text-[#3E2723] font-bold">
                {isGuest ? '会員登録してプレミアムを利用' : 'プレミアムで全機能をアンロック'}
              </p>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2.5 text-sm text-gray-600">
                <svg className="w-4 h-4 text-[#FCC800] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                広告なしでストレスフリー
              </div>
              <div className="flex items-center gap-2.5 text-sm text-gray-600">
                <svg className="w-4 h-4 text-[#FCC800] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                スピーキングモード
              </div>
              <div className="flex items-center gap-2.5 text-sm text-gray-600">
                <svg className="w-4 h-4 text-[#FCC800] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                AI応用ドリル & AIとフリー会話
              </div>
            </div>

            {isGuest && (
              <p className="text-xs text-gray-500 text-center mb-3">
                Plus / Pro への登録は、先に無料会員登録が必要です
              </p>
            )}

            <button
              onClick={() => {
                if (isGuest) {
                  router.push('/auth/register');
                  return;
                }
                setShowPaywall(true);
              }}
              className="w-full py-3 bg-[#3E2723] text-white rounded-xl font-bold text-sm active:scale-[0.98] transition-transform"
            >
              {isGuest ? '無料会員登録へ' : 'プレミアムを見る'}
            </button>
          </div>
        </div>
      )}

      <PaywallScreen isOpen={showPaywall} onClose={() => setShowPaywall(false)} />
    </>
  );
}
