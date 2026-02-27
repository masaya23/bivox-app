'use client';

import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  useSubscription,
  SubscriptionTier,
  TrainingMode,
  PLAN_NAMES,
  PLAN_PRICES,
  ANNUAL_PLAN_PRICES,
  PLAN_DESCRIPTIONS,
  MODE_NAMES,
  MODE_REQUIRED_PLAN,
} from '@/contexts/SubscriptionContext';
import { logSubscriptionCancel } from '@/utils/analytics';
import { useRevenueCat } from '@/hooks/useRevenueCat';

interface PaywallScreenProps {
  isOpen: boolean;
  onClose: () => void;
  highlightedMode?: TrainingMode;
}

// お客様の声データ
const TESTIMONIALS = [
  {
    name: 'Yuki',
    role: '大学生',
    rating: 5,
    comment: 'スピーキング判定がすごく便利！自分の発音の弱点がわかるようになりました。',
    avatar: '👩‍🎓',
  },
  {
    name: 'Takeshi',
    role: '社会人',
    rating: 5,
    comment: 'AIドリルで毎日新しい問題が出るので飽きずに続けられています。',
    avatar: '👨‍💼',
  },
  {
    name: 'Miki',
    role: '主婦',
    rating: 5,
    comment: '隙間時間に効率よく学習できます。広告なしで集中できるのが良い！',
    avatar: '👩',
  },
];

// 解約理由の選択肢
const CANCELLATION_REASONS = [
  { id: 'too_expensive', label: '料金が高い' },
  { id: 'not_using', label: 'あまり使っていない' },
  { id: 'missing_features', label: '欲しい機能がない' },
  { id: 'found_alternative', label: '他のサービスに乗り換える' },
  { id: 'temporary', label: '一時的にお休みしたい' },
  { id: 'other', label: 'その他' },
];

// 機能比較データ
const FEATURE_COMPARISON = [
  { feature: 'チュートリアル', free: true, plus: true, pro: true },
  { feature: 'ベーシックモード', free: true, plus: true, pro: true },
  { feature: 'スピーキングモード', free: '-', plus: '50回/日', pro: '無制限' },
  { feature: 'AI応用ドリル', free: '-', plus: '-', pro: '100回/日' },
  { feature: 'AIとフリー英会話', free: '-', plus: '-', pro: '100回/日' },
  { feature: '広告なし', free: false, plus: true, pro: true },
  { feature: 'バックグラウンド再生', free: false, plus: true, pro: true },
];

// プランアイコン（SVG）
function PlanIconStar() {
  return (
    <svg width={28} height={28} viewBox="0 0 24 24" fill="white">
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  );
}

function PlanIconPremium() {
  return (
    <svg width={28} height={28} viewBox="0 0 24 24" fill="white">
      <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
    </svg>
  );
}

export default function PaywallScreen({
  isOpen,
  onClose,
  highlightedMode,
}: PaywallScreenProps) {
  const { upgradePlan, getEffectiveTier, billingPeriod: currentBillingPeriod } = useSubscription();
  const effectiveTier = getEffectiveTier();
  const revenueCat = useRevenueCat();
  const isNative = Capacitor.isNativePlatform();

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionTier>(
    highlightedMode ? MODE_REQUIRED_PLAN[highlightedMode] : 'pro'
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('annual');
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  // 解約フロー用の状態
  type CancellationStep = 'none' | 'notice' | 'survey' | 'complete';
  const [cancellationStep, setCancellationStep] = useState<CancellationStep>('none');
  const [cancellationReason, setCancellationReason] = useState<string>('');

  if (!isOpen) return null;

  const plans: SubscriptionTier[] = ['plus', 'pro'];

  const planColors: Record<SubscriptionTier, { gradient: string; border: string; badge: string; bg: string }> = {
    free: {
      gradient: 'from-[#FCC800] to-[#FFD900]',
      border: 'border-gray-300',
      badge: 'bg-gray-500',
      bg: 'bg-gray-50',
    },
    plus: {
      gradient: 'from-amber-500 to-orange-500',
      border: 'border-orange-400',
      badge: 'bg-orange-500',
      bg: 'bg-orange-50',
    },
    pro: {
      gradient: 'from-purple-500 to-pink-500',
      border: 'border-purple-400',
      badge: 'bg-purple-500',
      bg: 'bg-purple-50',
    },
  };

  const renderPlanIcon = (plan: SubscriptionTier) => {
    if (plan === 'plus') return <PlanIconStar />;
    if (plan === 'pro') return <PlanIconPremium />;
    // free: シンプルなアイコン
    return (
      <svg width={28} height={28} viewBox="0 0 24 24" fill="white">
        <path d="M15.5 9.5c-.28 0-.5.22-.5.5v2c0 .28.22.5.5.5h3c.28 0 .5-.22.5-.5v-2c0-.28-.22-.5-.5-.5h-3zm-7 0c-.28 0-.5.22-.5.5v2c0 .28.22.5.5.5h3c.28 0 .5-.22.5-.5v-2c0-.28-.22-.5-.5-.5h-3zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-4-4.5c0 .83.67 1.5 1.5 1.5h5c.83 0 1.5-.67 1.5-1.5V15H8v.5z" />
      </svg>
    );
  };

  const getPrice = (plan: SubscriptionTier) => {
    if (billingPeriod === 'annual') {
      return ANNUAL_PLAN_PRICES[plan];
    }
    return PLAN_PRICES[plan];
  };

  const getMonthlyPrice = (plan: SubscriptionTier) => {
    if (billingPeriod === 'annual') {
      return Math.round(ANNUAL_PLAN_PRICES[plan] / 12);
    }
    return PLAN_PRICES[plan];
  };

  const handlePurchase = async () => {
    if (selectedPlan === 'free' || (selectedPlan === effectiveTier && currentBillingPeriod === billingPeriod)) {
      onClose();
      return;
    }

    setIsProcessing(true);
    setPurchaseError(null);

    try {
      // ネイティブアプリの場合はRevenueCatで購入
      if (isNative) {
        let success = false;
        if (selectedPlan === 'plus') {
          success = await revenueCat.purchasePlus(billingPeriod);
        } else if (selectedPlan === 'pro') {
          success = await revenueCat.purchasePro(billingPeriod);
        }

        if (success) {
          // 購入成功時、SubscriptionContextも更新
          upgradePlan(selectedPlan, billingPeriod);
          setTimeout(() => onClose(), 500);
        } else {
          // エラーがあれば表示（パッケージ未取得、ストア接続不可など）
          setPurchaseError(revenueCat.error || 'ストアに接続できませんでした。しばらくしてからお試しください。');
        }
      } else {
        // Webの場合はモック処理（デモ用）
        await new Promise((resolve) => setTimeout(resolve, 1500));
        upgradePlan(selectedPlan, billingPeriod);
        setTimeout(() => onClose(), 500);
      }
    } catch (error) {
      console.error('Purchase error:', error);
      setPurchaseError(error instanceof Error ? error.message : '購入に失敗しました');
    } finally {
      setIsProcessing(false);
    }
  };

  // 購入を復元
  const handleRestorePurchases = async () => {
    if (!isNative) return;

    setIsProcessing(true);
    setPurchaseError(null);

    try {
      const success = await revenueCat.restorePurchases();
      if (success && revenueCat.currentPlan !== 'free') {
        // 復元時はデフォルトで年額として扱う（実際はRevenueCatから取得）
        upgradePlan(revenueCat.currentPlan, 'annual');
        setTimeout(() => onClose(), 500);
      } else if (!success) {
        setPurchaseError('復元する購入がありませんでした');
      }
    } catch (error) {
      setPurchaseError('購入の復元に失敗しました');
    } finally {
      setIsProcessing(false);
    }
  };

  const planModes: Record<SubscriptionTier, TrainingMode[]> = {
    free: ['tutorial', 'shadowing'],
    plus: ['tutorial', 'shadowing', 'speaking'],
    pro: ['tutorial', 'shadowing', 'speaking', 'ai-drill', 'ai-conversation'],
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-[430px] h-full max-h-screen overflow-y-auto">
        {/* ヘッダー */}
        <div className="sticky top-0 bg-white px-4 py-4 border-b border-gray-100 z-10">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 text-xl"
            >
              ×
            </button>
            <h1 className="text-lg font-black text-gray-800">プレミアムプラン</h1>
            <div className="w-10" />
          </div>
        </div>

        <div className="px-4 py-6">
          {/* キャッチコピー */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-black text-gray-800 mb-2">
              もっと効果的に学習しよう
            </h2>
            <p className="text-gray-500 text-sm">
              あなたに合ったプランを選んで英語力をグングン伸ばそう！
            </p>
          </div>

          {/* 年額/月額トグル */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              月額
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all relative ${
                billingPeriod === 'annual'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              年額
              <span className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                2ヶ月分お得
              </span>
            </button>
          </div>

          {/* 現在のプラン表示 */}
          {effectiveTier !== 'free' && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 text-center">
              <span className="text-green-600 font-bold text-sm">
                ✓ 現在のプラン: {PLAN_NAMES[effectiveTier]}
              </span>
            </div>
          )}

          {/* プラン選択 */}
          <div className="space-y-4 mb-8">
            {plans.map((plan) => {
              const isSelected = selectedPlan === plan;
              const isCurrent = effectiveTier === plan;
              const colors = planColors[plan];

              return (
                <button
                  key={plan}
                  onClick={() => setSelectedPlan(plan)}
                  className={`
                    w-full p-4 rounded-2xl border-2 transition-all text-left relative overflow-hidden
                    ${isSelected ? colors.border + ' shadow-lg scale-[1.02]' : 'border-gray-200'}
                    ${isCurrent ? 'opacity-60' : ''}
                  `}
                >
                  {/* 一番人気バッジ */}
                  {plan === 'pro' && (
                    <div className="absolute top-0 right-0">
                      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">
                        一番人気
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-4">
                    {/* プランアイコン */}
                    <div
                      className={`
                        w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0
                        bg-gradient-to-br ${colors.gradient}
                      `}
                    >
                      {renderPlanIcon(plan)}
                    </div>

                    {/* プラン情報 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-800 text-lg">
                          {PLAN_NAMES[plan]}
                        </h3>
                        {isCurrent && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded">
                            {currentBillingPeriod === billingPeriod ? '利用中' : `${currentBillingPeriod === 'annual' ? '年額' : '月額'}で利用中`}
                          </span>
                        )}
                      </div>

                      {/* 価格 */}
                      <div className="mb-2">
                        {billingPeriod === 'annual' && (
                          <span className="text-gray-400 text-sm line-through mr-2">
                            ¥{(PLAN_PRICES[plan] * 12).toLocaleString()}
                          </span>
                        )}
                        <span className="text-2xl font-black text-gray-800">
                          ¥{getPrice(plan).toLocaleString()}
                        </span>
                        <span className="text-gray-400 text-sm">
                          /{billingPeriod === 'annual' ? '年' : '月'}
                        </span>
                        {billingPeriod === 'annual' && (
                          <span className="text-xs text-gray-500 ml-2">
                            (月額¥{getMonthlyPrice(plan).toLocaleString()})
                          </span>
                        )}
                      </div>

                      {/* 利用可能なモード */}
                      <div className="flex flex-wrap gap-1">
                        {planModes[plan].map((mode) => (
                          <span
                            key={mode}
                            className={`
                              px-2 py-0.5 rounded text-xs font-medium
                              ${highlightedMode === mode
                                ? 'bg-green-100 text-green-700 ring-2 ring-green-300'
                                : 'bg-gray-100 text-gray-600'
                              }
                            `}
                          >
                            {MODE_NAMES[mode]}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* 選択インジケーター */}
                    <div
                      className={`
                        w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0
                        ${isSelected ? colors.border + ' ' + colors.badge : 'border-gray-300'}
                      `}
                    >
                      {isSelected && <span className="text-white text-sm">✓</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* 機能比較表 */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">機能比較</h3>
            <div className="bg-gray-50 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-3 px-3 text-left font-bold text-gray-600">機能</th>
                    <th className="py-3 px-2 text-center font-bold text-gray-400">Free</th>
                    <th className="py-3 px-2 text-center font-bold text-orange-600">Plus</th>
                    <th className={`py-3 px-2 text-center font-bold text-purple-600 ${selectedPlan === 'pro' ? 'bg-purple-50' : ''}`}>Pro</th>
                  </tr>
                </thead>
                <tbody>
                  {FEATURE_COMPARISON.map((row, index) => (
                    <tr key={index} className={index < FEATURE_COMPARISON.length - 1 ? 'border-b border-gray-100' : ''}>
                      <td className="py-2.5 px-3 text-gray-700">{row.feature}</td>
                      <td className="py-2.5 px-2 text-center">
                        {typeof row.free === 'boolean' ? (
                          row.free ? <span className="text-green-500">✓</span> : <span className="text-gray-300">-</span>
                        ) : (
                          <span className="text-gray-400 text-xs">{row.free}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {typeof row.plus === 'boolean' ? (
                          row.plus ? <span className="text-green-500">✓</span> : <span className="text-gray-300">-</span>
                        ) : (
                          <span className="text-orange-600 text-xs font-medium">{row.plus}</span>
                        )}
                      </td>
                      <td className={`py-2.5 px-2 text-center ${selectedPlan === 'pro' ? 'bg-purple-50' : ''}`}>
                        {typeof row.pro === 'boolean' ? (
                          row.pro ? <span className="text-green-500 font-bold">✓</span> : <span className="text-gray-300">-</span>
                        ) : (
                          <span className="text-purple-600 text-xs font-bold">{row.pro}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* お客様の声 */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">お客様の声</h3>
            <div className="space-y-3">
              {TESTIMONIALS.map((testimonial, index) => (
                <div
                  key={index}
                  className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl">
                      {testimonial.avatar}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-800 text-sm">{testimonial.name}</span>
                        <span className="text-gray-400 text-xs">{testimonial.role}</span>
                      </div>
                      <div className="flex items-center gap-0.5 mb-2">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <span key={i} className="text-yellow-400 text-xs">★</span>
                        ))}
                      </div>
                      <p className="text-gray-600 text-sm">{testimonial.comment}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 選択中のプランの詳細 */}
          <div className={`${planColors[selectedPlan].bg} rounded-2xl p-4 mb-6`}>
            <h4 className="font-bold text-gray-800 text-sm mb-3">
              {PLAN_NAMES[selectedPlan]}の特典
            </h4>
            <ul className="space-y-2">
              {PLAN_DESCRIPTIONS[selectedPlan].map((desc, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="text-green-500">✓</span>
                  {desc}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 購入ボタン（固定フッター） */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-4 shadow-lg">
          {/* エラー表示 */}
          {purchaseError && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-center">
              <p className="text-red-600 text-sm">{purchaseError}</p>
            </div>
          )}

          <button
            onClick={handlePurchase}
            disabled={isProcessing || (effectiveTier === selectedPlan && currentBillingPeriod === billingPeriod) || revenueCat.isLoading}
            className={`
              w-full py-4 rounded-2xl font-bold text-lg text-white
              bg-gradient-to-r ${
                selectedPlan === 'pro'
                  ? 'from-purple-500 to-pink-500'
                  : selectedPlan === 'free'
                    ? 'from-[#FCC800] to-[#FFD900]'
                    : 'from-amber-500 to-orange-500'
              }
              active:scale-[0.98] transition-all
              disabled:opacity-50 disabled:cursor-not-allowed
              shadow-lg
            `}
          >
            {isProcessing || revenueCat.isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                処理中...
              </span>
            ) : effectiveTier === selectedPlan && currentBillingPeriod === billingPeriod ? (
              '利用中のプラン'
            ) : effectiveTier === selectedPlan ? (
              `${billingPeriod === 'annual' ? '年額' : '月額'}プランに切り替え - ¥${getPrice(selectedPlan).toLocaleString()}/${billingPeriod === 'annual' ? '年' : '月'}`
            ) : (
              `${PLAN_NAMES[selectedPlan]}を始める - ¥${getPrice(selectedPlan).toLocaleString()}/${billingPeriod === 'annual' ? '年' : '月'}`
            )}
          </button>

          <p className="text-center text-xs text-gray-400 mt-3">
            いつでもキャンセル可能 • 決済はApp Store / Google Playを通じて行われます
          </p>

          {/* 購入を復元（ネイティブアプリのみ） */}
          {isNative && (
            <button
              onClick={handleRestorePurchases}
              disabled={isProcessing || revenueCat.isLoading}
              className="w-full py-2 text-blue-500 font-medium text-sm mt-2 disabled:opacity-50"
            >
              以前の購入を復元
            </button>
          )}

          {/* 無料プランに戻る */}
          {effectiveTier !== 'free' && (
            <button
              onClick={() => setCancellationStep('notice')}
              className="w-full py-2 text-gray-400 text-xs mt-2"
            >
              無料プランに戻す
            </button>
          )}
        </div>
      </div>

      {/* 解約フローモーダル */}
      {cancellationStep !== 'none' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
          <div className="bg-white w-full max-w-[400px] mx-4 rounded-3xl overflow-hidden shadow-2xl">
            {/* ステップ1: 注意事項 */}
            {cancellationStep === 'notice' && (
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-amber-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="text-3xl">⚠️</span>
                  </div>
                  <h3 className="text-xl font-black text-gray-800 mb-2">
                    解約の前にご確認ください
                  </h3>
                  <p className="text-gray-500 text-sm">
                    以下の特典が利用できなくなります
                  </p>
                </div>

                <div className="bg-gray-50 rounded-2xl p-4 mb-6 space-y-3">
                  {effectiveTier === 'pro' && (
                    <>
                      <div className="flex items-center gap-3 text-sm text-gray-700">
                        <span className="text-red-500">✗</span>
                        <span>AI応用ドリル・AIとフリー英会話</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-700">
                        <span className="text-red-500">✗</span>
                        <span>無制限のスピーキング判定</span>
                      </div>
                    </>
                  )}
                  {(effectiveTier === 'pro' || effectiveTier === 'plus') && (
                    <>
                      <div className="flex items-center gap-3 text-sm text-gray-700">
                        <span className="text-red-500">✗</span>
                        <span>スピーキングモード</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-700">
                        <span className="text-red-500">✗</span>
                        <span>広告非表示</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
                  <p className="text-amber-800 text-sm font-medium text-center">
                    現在の契約期間終了まで引き続きご利用いただけます
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => setCancellationStep('survey')}
                    className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm"
                  >
                    解約手続きに進む
                  </button>
                  <button
                    onClick={() => setCancellationStep('none')}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-sm"
                  >
                    プランを継続する
                  </button>
                </div>
              </div>
            )}

            {/* ステップ2: アンケート */}
            {cancellationStep === 'survey' && (
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="text-3xl">📝</span>
                  </div>
                  <h3 className="text-xl font-black text-gray-800 mb-2">
                    解約理由を教えてください
                  </h3>
                  <p className="text-gray-500 text-sm">
                    サービス改善の参考にさせていただきます
                  </p>
                </div>

                <div className="space-y-2 mb-6">
                  {CANCELLATION_REASONS.map((reason) => (
                    <button
                      key={reason.id}
                      onClick={() => setCancellationReason(reason.id)}
                      className={`
                        w-full py-3 px-4 rounded-xl border-2 text-left text-sm font-medium transition-all
                        ${cancellationReason === reason.id
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        }
                      `}
                    >
                      {reason.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => {
                      if (cancellationReason) {
                        setCancellationStep('complete');
                        // Analytics: 解約イベント
                        if (effectiveTier !== 'free') {
                          logSubscriptionCancel(effectiveTier, cancellationReason);
                        }
                      }
                    }}
                    disabled={!cancellationReason}
                    className="w-full py-3 bg-red-500 text-white rounded-xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    解約手続きへ進む
                  </button>
                  <button
                    onClick={() => setCancellationStep('notice')}
                    className="w-full py-3 text-gray-500 font-medium text-sm"
                  >
                    戻る
                  </button>
                </div>
              </div>
            )}

            {/* ステップ3: ストアへ誘導 */}
            {cancellationStep === 'complete' && (
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-amber-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="text-3xl">📱</span>
                  </div>
                  <h3 className="text-xl font-black text-gray-800 mb-2">
                    サブスクリプション管理画面を開きます
                  </h3>
                  <p className="text-gray-500 text-sm">
                    ストアの設定画面で解約手続きを行ってください
                  </p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-6">
                  <p className="text-amber-800 text-xs text-center">
                    解約後も現在の契約期間終了まで引き続きご利用いただけます。いつでもプランを再開できます。
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => {
                      const platform = Capacitor.getPlatform();
                      if (platform === 'ios') {
                        window.open('https://apps.apple.com/account/subscriptions', '_blank');
                      } else if (platform === 'android') {
                        window.open('https://play.google.com/store/account/subscriptions', '_blank');
                      } else {
                        // Web: 手順を案内
                        window.open('https://support.apple.com/ja-jp/HT202039', '_blank');
                      }
                    }}
                    className="w-full py-3 bg-red-500 text-white rounded-xl font-bold text-sm active:scale-[0.98] transition-transform"
                  >
                    {Capacitor.getPlatform() === 'ios' ? 'App Storeの設定を開く' :
                     Capacitor.getPlatform() === 'android' ? 'Google Playの設定を開く' :
                     'サブスクリプション管理を開く'}
                  </button>
                  <button
                    onClick={() => {
                      setCancellationStep('none');
                      setCancellationReason('');
                      onClose();
                    }}
                    className="w-full py-3 text-gray-500 font-medium text-sm"
                  >
                    閉じる
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
