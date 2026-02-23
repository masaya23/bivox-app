'use client';

import { useRouter } from 'next/navigation';

export default function PrivacyPage() {
  const router = useRouter();

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
            プライバシーポリシー
          </h1>
        </div>
      </header>

      {/* コンテンツ */}
      <div className="px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-6">
          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">はじめに</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Bivox - 瞬間英会話 -（以下「本アプリ」といいます）は、ユーザーのプライバシーを尊重し、
              個人情報の保護に努めています。本プライバシーポリシーは、本アプリがどのような情報を収集し、
              どのように利用・保護するかについて説明します。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">1. 収集する情報</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">
              本アプリでは、以下の情報を収集することがあります。
            </p>
            <ul className="text-sm text-gray-600 leading-relaxed list-disc list-inside space-y-1">
              <li>メールアドレス（アカウント登録時）</li>
              <li>学習履歴・進捗データ</li>
              <li>音声データ（スピーキング機能利用時、一時的に処理）</li>
              <li>デバイス情報（OS、アプリバージョン等）</li>
              <li>利用状況に関する統計データ</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">2. 情報の利用目的</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">
              収集した情報は、以下の目的で利用します。
            </p>
            <ul className="text-sm text-gray-600 leading-relaxed list-disc list-inside space-y-1">
              <li>本アプリのサービス提供・運営</li>
              <li>ユーザーの学習体験の向上・パーソナライズ</li>
              <li>カスタマーサポートの提供</li>
              <li>サービスの改善・新機能の開発</li>
              <li>利用規約違反への対応</li>
              <li>重要なお知らせの配信</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">3. 情報の保存</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              学習データの多くはユーザーのデバイス上（ローカルストレージ）に保存されます。
              クラウドへの同期機能を利用する場合、データは暗号化された状態で安全に保管されます。
              音声データは発音判定の処理のみに使用され、サーバーには保存されません。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">4. 第三者への提供</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">
              本アプリは、以下の場合を除き、ユーザーの個人情報を第三者に提供することはありません。
            </p>
            <ul className="text-sm text-gray-600 leading-relaxed list-disc list-inside space-y-1">
              <li>ユーザーの同意がある場合</li>
              <li>法令に基づく場合</li>
              <li>人の生命、身体または財産の保護のために必要がある場合</li>
              <li>サービス提供に必要な業務委託先への提供（適切な管理のもと）</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">5. 外部サービスの利用</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">
              本アプリでは、以下の外部サービスを利用しています。
            </p>
            <ul className="text-sm text-gray-600 leading-relaxed list-disc list-inside space-y-1">
              <li>OpenAI API（AI機能）</li>
              <li>Google AdMob（広告配信、無料プランのみ）</li>
              <li>RevenueCat（課金管理）</li>
              <li>Firebase Analytics（利用状況分析）</li>
            </ul>
            <p className="text-sm text-gray-600 leading-relaxed mt-2">
              これらのサービスは、それぞれ独自のプライバシーポリシーに基づいて運営されています。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">6. 広告について</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              無料プランでは、Google AdMobを通じて広告が表示されます。
              広告配信のため、デバイス情報や利用状況が収集される場合があります。
              パーソナライズ広告を希望しない場合は、デバイスの設定から変更できます。
              有料プランにアップグレードすると、広告は表示されなくなります。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">7. お子様のプライバシー</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              本アプリは、13歳未満のお子様から意図的に個人情報を収集することはありません。
              13歳未満のお子様が本アプリを利用する場合は、保護者の同意と監督のもとでご利用ください。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">8. データの削除</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              ユーザーは、設定画面からいつでも学習データを削除することができます。
              アカウントの削除を希望する場合は、お問い合わせフォームよりご連絡ください。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">9. セキュリティ</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              本アプリは、ユーザーの情報を不正アクセス、紛失、破壊、改ざん、漏洩などから保護するため、
              適切なセキュリティ対策を講じています。ただし、インターネット上の通信は完全に安全ではないため、
              情報の送信は自己責任で行ってください。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">10. ポリシーの変更</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              本プライバシーポリシーは、必要に応じて変更されることがあります。
              重要な変更がある場合は、アプリ内でお知らせします。
              変更後も本アプリを継続して利用することで、変更後のポリシーに同意したものとみなされます。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">11. お問い合わせ</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              本プライバシーポリシーに関するお問い合わせは、設定画面内のお問い合わせフォームよりご連絡ください。
            </p>
          </section>

          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-400 text-center">
              最終更新日: 2024年1月1日
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
