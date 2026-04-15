'use client';

import { useEffect } from 'react';
import { useAppRouter } from '@/hooks/useAppRouter';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAdMob } from '@/hooks/useAdMob';

export default function TermsPage() {
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
            利用規約
          </h1>
        </div>
      </header>

      {/* コンテンツ */}
      <div className="px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-6">
          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">第1条（適用）</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              本規約は、Bivox - 瞬間英会話 -（以下「本アプリ」といいます）の利用に関する条件を定めるものです。
              ユーザーは本規約に同意した上で本アプリをご利用ください。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">第2条（利用登録）</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              本アプリの利用を希望する方は、本規約に同意の上、所定の方法により利用登録を行うものとします。
              利用登録の完了をもって、ユーザーと運営者との間で本規約を内容とする利用契約が成立するものとします。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">第3条（禁止事項）</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">
              ユーザーは、本アプリの利用にあたり、以下の行為をしてはなりません。
            </p>
            <ul className="text-sm text-gray-600 leading-relaxed list-disc list-inside space-y-1">
              <li>法令または公序良俗に違反する行為</li>
              <li>犯罪行為に関連する行為</li>
              <li>運営者のサーバーまたはネットワークの機能を破壊・妨害する行為</li>
              <li>本アプリの運営を妨害するおそれのある行為</li>
              <li>他のユーザーに関する個人情報等を収集・蓄積する行為</li>
              <li>他のユーザーに成りすます行為</li>
              <li>本アプリに関連して、反社会的勢力に対して直接または間接に利益を供与する行為</li>
              <li>その他、運営者が不適切と判断する行為</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">第4条（本アプリの提供の停止等）</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              運営者は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく
              本アプリの全部または一部の提供を停止または中断することができるものとします。
            </p>
            <ul className="text-sm text-gray-600 leading-relaxed list-disc list-inside space-y-1 mt-2">
              <li>本アプリにかかるシステムの保守点検または更新を行う場合</li>
              <li>地震、落雷、火災、停電または天災などの不可抗力により、本アプリの提供が困難となった場合</li>
              <li>その他、運営者が本アプリの提供が困難と判断した場合</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">第5条（有料サービス）</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              本アプリには有料のプレミアム機能が含まれます。
              有料サービスの料金、支払方法、解約方法等については、アプリ内の該当ページに記載のとおりとします。
              サブスクリプションは自動更新されます。解約を希望する場合は、更新日の24時間前までに手続きを行ってください。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">第6条（AI機能の利用）</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">
              本アプリでは、スピーキングモード・AI応用ドリル・AIフリー英会話等の機能において、
              外部のAIサービス（OpenAI API）を利用しています。
            </p>
            <ul className="text-sm text-gray-600 leading-relaxed list-disc list-inside space-y-1">
              <li>ユーザーが入力した音声・テキストデータは、AI処理のために外部サーバーに送信されます</li>
              <li>AIによる判定・生成結果の正確性は保証されません</li>
              <li>AI機能の利用には通信環境が必要です</li>
              <li>AIサービス提供元の障害やメンテナンスにより、一時的に利用できない場合があります</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">第7条（免責事項）</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              運営者は、本アプリに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、
              特定の目的への適合性、セキュリティなどに関する欠陥、エラーやバグ、権利侵害などを含みます）
              がないことを明示的にも黙示的にも保証しておりません。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">第8条（規約の変更）</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              運営者は、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。
              変更後の利用規約は、本アプリ上に表示した時点より効力を生じるものとします。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">第9条（準拠法・裁判管轄）</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              本規約の解釈にあたっては、日本法を準拠法とします。
              本アプリに関して紛争が生じた場合には、運営者の本店所在地を管轄する裁判所を専属的合意管轄とします。
            </p>
          </section>

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
