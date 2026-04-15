'use client';

import { useEffect } from 'react';
import { useAppRouter } from '@/hooks/useAppRouter';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAdMob } from '@/hooks/useAdMob';

export default function TokushohoPage() {
  const router = useAppRouter();
  const { shouldShowAds } = useSubscription();
  const { isNative, isInitialized, showBanner, hideBanner } = useAdMob();

  useEffect(() => {
    if (!isNative || !isInitialized) return;

    void hideBanner();

    return () => {
      if (shouldShowAds()) {
        void showBanner('BOTTOM');
      }
    };
  }, [hideBanner, isInitialized, isNative, shouldShowAds, showBanner]);

  return (
    <div className="min-h-screen bg-gray-50 max-w-[430px] mx-auto">
      {/* ヘッダー */}
      <header className="bg-white px-4 py-3 sticky top-0 z-30 border-b border-gray-100">
        <div className="flex items-center">
          <button
            onClick={() => router.back()}
            className="text-gray-600 font-semibold text-sm"
          >
            ← 戻る
          </button>
          <h1 className="flex-1 text-center font-bold text-gray-800 pr-12">
            特定商取引法に基づく表記
          </h1>
        </div>
      </header>

      {/* コンテンツ */}
      <div className="px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-5">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-1">販売事業者</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Bivox運営事務局
              </p>
              <p className="text-xs text-gray-400 mt-1">
                ※氏名（名称）は請求があった場合に遅滞なく開示いたします
              </p>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-1">所在地</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                請求があった場合に遅滞なく開示いたします
              </p>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-1">連絡先</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                メールアドレス: ztnrngtd2312@gmail.com
              </p>
              <p className="text-sm text-gray-600 leading-relaxed">
                電話番号: 請求があった場合に遅滞なく開示いたします
              </p>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-1">販売価格</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                アプリ内の各サブスクリプションプランの購入画面に表示された価格に準じます。
              </p>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-1">支払方法</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                App Store（Apple）またはGoogle Playの決済システムを通じたお支払い
              </p>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-1">支払時期</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                購入手続き完了時に即時課金されます。サブスクリプションは契約期間満了時に自動更新されます。
              </p>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-1">商品の引渡し時期</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                購入手続き完了後、即時ご利用いただけます。
              </p>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-1">返品・キャンセルについて</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                デジタルコンテンツの性質上、購入後の返品・返金はお受けしておりません。
                サブスクリプションの解約は、次回更新日の24時間前までにApp StoreまたはGoogle Playの設定から行ってください。
                解約後も契約期間終了まではサービスをご利用いただけます。
              </p>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-1">動作環境</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                iOS 15.0以上 / Android 8.0以上
              </p>
              <p className="text-xs text-gray-400 mt-1">
                ※一部機能にはインターネット接続が必要です
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-400 text-center">
              最終更新日: 2026年2月1日
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
