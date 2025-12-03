'use client';

import Link from 'next/link';

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-2xl p-8 md:p-12 my-8">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-black text-gray-800 mb-2">
            ヘルプ
          </h1>
          <p className="text-gray-600">無限英作文の使い方</p>
        </div>

        {/* 基本的な使い方 */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-3xl">📖</span>
            基本的な使い方
          </h2>
          <div className="bg-green-50 rounded-2xl p-6 space-y-4">
            <div>
              <h3 className="font-bold text-gray-800 mb-2">1. トレーニング開始</h3>
              <p className="text-sm text-gray-700">
                ホーム画面の「トレーニング開始」ボタンをクリックして学習を始めます。
              </p>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 mb-2">2. 問題を解く</h3>
              <p className="text-sm text-gray-700">
                日本語文が表示されるので、英語に翻訳します。「🎤 音声で答える」または「答えを見る」を選択できます。
              </p>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 mb-2">3. 評価する</h3>
              <p className="text-sm text-gray-700">
                自分の答えを「完璧」「まあまあ」「難しい」の3段階で評価します。この評価がSRS（間隔反復）システムに記録されます。
              </p>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 mb-2">4. 結果を確認</h3>
              <p className="text-sm text-gray-700">
                全問終了後、今回の成績と連続学習記録（Streak）、全体統計が表示されます。
              </p>
            </div>
          </div>
        </section>

        {/* 音声機能 */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-3xl">🎤</span>
            音声機能
          </h2>
          <div className="bg-blue-50 rounded-2xl p-6 space-y-4">
            <div>
              <h3 className="font-bold text-gray-800 mb-2">音声で答える</h3>
              <p className="text-sm text-gray-700 mb-2">
                「🎤 音声で答える」をクリックすると、日本語文が読み上げられた後、音声認識が開始されます。英語で答えを話してください。
              </p>
              <ul className="text-sm text-gray-700 list-disc list-inside space-y-1 ml-2">
                <li>自動でタイムアウト（デフォルト10秒）します</li>
                <li>「録音停止」ボタンで手動停止も可能</li>
                <li>認識された音声は自動で正誤判定されます</li>
                <li>判定が不満な場合は「やり直し」が可能</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 mb-2">音声読み上げ</h3>
              <p className="text-sm text-gray-700 mb-2">
                英文の横にある「🔊」ボタンで、英文の読み上げができます。
              </p>
              <ul className="text-sm text-gray-700 list-disc list-inside space-y-1 ml-2">
                <li>自動再生ON/OFFの切り替えが可能</li>
                <li>読み上げ速度の調整（×0.5〜×2.0）</li>
                <li>日本語もAI音声で読み上げ対応</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 機能説明 */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-3xl">⚡</span>
            主要機能
          </h2>
          <div className="bg-purple-50 rounded-2xl p-6 space-y-4">
            <div>
              <h3 className="font-bold text-gray-800 mb-2">🔥 連続学習記録（Streak）</h3>
              <p className="text-sm text-gray-700">
                毎日トレーニングを完了することで、連続学習日数がカウントされます。モチベーション維持に役立ちます。
              </p>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 mb-2">🎯 間隔反復システム（SRS）</h3>
              <p className="text-sm text-gray-700">
                あなたの評価に基づいて、苦手な例文は多く、得意な例文は少なめに出題されるよう自動調整されます。効率的に記憶できます。
              </p>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 mb-2">⚡ 瞬間英作文モード</h3>
              <p className="text-sm text-gray-700">
                問題画面で「瞬間英作文」をONにすると、日本語が自動で読み上げられ、すぐに音声入力が開始されます。スピーディーな学習に最適です。
              </p>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 mb-2">🤖 AI質問機能</h3>
              <p className="text-sm text-gray-700">
                分からない文法や表現について、AIに質問できます。「AI に質問」ボタンをクリックして質問を入力してください。
              </p>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 mb-2">📊 学習統計</h3>
              <p className="text-sm text-gray-700">
                総セッション数、総問題数、平均正解率など、あなたの学習記録が自動で記録・表示されます。
              </p>
            </div>
          </div>
        </section>

        {/* 設定 */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-3xl">⚙️</span>
            設定
          </h2>
          <div className="bg-orange-50 rounded-2xl p-6 space-y-4">
            <div>
              <h3 className="font-bold text-gray-800 mb-2">タイムアウト時間</h3>
              <p className="text-sm text-gray-700">
                音声入力の自動タイムアウト時間を調整できます（5〜30秒）。問題画面の「⚙️ 設定」から変更できます。
              </p>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 mb-2">正解判定の厳しさ</h3>
              <p className="text-sm text-gray-700">
                類似度の閾値を調整できます（50〜95%）。低いほど寛容、高いほど厳格な判定になります。
              </p>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 mb-2">データのバックアップ</h3>
              <p className="text-sm text-gray-700">
                ホーム画面の「⚙️ 設定」から、学習データのエクスポート・インポートが可能です。機種変更時などに便利です。
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-3xl">❓</span>
            よくある質問
          </h2>
          <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
            <div>
              <h3 className="font-bold text-gray-800 mb-2">音声認識が動作しない</h3>
              <p className="text-sm text-gray-700">
                ChromeやEdgeなどの対応ブラウザを使用してください。また、マイクの権限を許可する必要があります。
              </p>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 mb-2">データが消えてしまった</h3>
              <p className="text-sm text-gray-700">
                ブラウザのキャッシュクリアなどで消える可能性があります。定期的にバックアップを取ることをおすすめします。
              </p>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 mb-2">オフラインで使えますか？</h3>
              <p className="text-sm text-gray-700">
                PWA対応により、一度読み込めばオフラインでも基本機能は使用可能です。ただし、AI質問や例文生成にはインターネット接続が必要です。
              </p>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 mb-2">例文は増やせますか？</h3>
              <p className="text-sm text-gray-700">
                現在はダミーデータですが、将来的にAI生成で無限に例文を増やせるようになる予定です。
              </p>
            </div>
          </div>
        </section>

        {/* Tips */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-3xl">💡</span>
            学習のコツ
          </h2>
          <div className="bg-yellow-50 rounded-2xl p-6">
            <ul className="text-sm text-gray-700 space-y-3">
              <li className="flex gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>毎日少しずつでも続けることが大切。Streakを途切れさせないようにしましょう</span>
              </li>
              <li className="flex gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>最初は答えを見ながらでOK。繰り返すうちに自然と覚えられます</span>
              </li>
              <li className="flex gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>音声で答える練習をすると、スピーキング力も同時に鍛えられます</span>
              </li>
              <li className="flex gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>分からない表現はAIに質問して、理解を深めましょう</span>
              </li>
              <li className="flex gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>瞬間英作文モードで、反射的に英語が出るまで練習しましょう</span>
              </li>
            </ul>
          </div>
        </section>

        {/* 戻るボタン */}
        <Link
          href="/"
          className="block w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-2xl text-center hover:from-blue-600 hover:to-purple-600 transition-all transform hover:scale-105 shadow-lg"
        >
          ホームに戻る
        </Link>
      </div>
    </div>
  );
}
