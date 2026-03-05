'use client';

import MobileLayout, { PageHeader } from '@/components/MobileLayout';

// ヘルプ用セクションカード（設定画面と同じスタイル）
function HelpCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="mx-4 rounded-2xl bg-white shadow-[0_4px_10px_rgba(0,0,0,0.05)] overflow-hidden">
      <div className="px-5 pt-4 pb-1">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F8F6F4]">
            {icon}
          </div>
          <h2 className="text-sm font-bold text-[#3E2723]">{title}</h2>
        </div>
      </div>
      <div className="px-5 pb-5">
        {children}
      </div>
    </div>
  );
}

// セクション見出し（設定画面と同じ）
function SectionHeader({ title }: { title: string }) {
  return (
    <p className="px-4 pt-6 pb-2 text-[11px] font-semibold text-gray-500 tracking-wide">
      {title}
    </p>
  );
}

// ========== SVGアイコン群 ==========

// 本（学習の始め方）
function IconBook() {
  return (
    <svg className="w-5 h-5 text-[#6D4C41]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  );
}

// ヘッドフォン（トレーニングモード）
function IconHeadphones() {
  return (
    <svg className="w-5 h-5 text-[#6D4C41]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18v-6a9 9 0 0118 0v6" />
      <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3v5zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3v5z" />
    </svg>
  );
}

// マイク（音声機能）
function IconMic() {
  return (
    <svg className="w-5 h-5 text-[#6D4C41]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10a7 7 0 0014 0" />
      <path d="M12 17v4" />
      <path d="M8 21h8" />
    </svg>
  );
}

// グラフ（学習記録）
function IconChart() {
  return (
    <svg className="w-5 h-5 text-[#6D4C41]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10" />
      <path d="M12 20V4" />
      <path d="M6 20v-6" />
    </svg>
  );
}

// ハート（ライフシステム）
function IconHeart() {
  return (
    <svg className="w-5 h-5 text-[#6D4C41]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}

// 王冠（プラン）
function IconCrown() {
  return (
    <svg className="w-5 h-5 text-[#6D4C41]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" />
      <path d="M5 16h14v4H5z" />
    </svg>
  );
}

// 歯車（設定）
function IconGear() {
  return (
    <svg className="w-5 h-5 text-[#6D4C41]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

// はてな（FAQ）
function IconQuestion() {
  return (
    <svg className="w-5 h-5 text-[#6D4C41]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9a3 3 0 015.12 2.15c0 1.5-2.12 2.1-2.12 3.35" />
      <path d="M12 17h.01" />
    </svg>
  );
}

// 電球（学習のコツ）
function IconTip() {
  return (
    <svg className="w-5 h-5 text-[#6D4C41]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 00-3 13.33V17h6v-1.67A7 7 0 0012 2z" />
    </svg>
  );
}

// チェックマーク付きリストアイテム
function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <svg className="w-4 h-4 text-[#FCC800] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
      <span>{children}</span>
    </li>
  );
}

const SUPPORT_EMAIL = 'ztnrngtd2312@gmail.com';

function openContactEmail() {
  const subject = encodeURIComponent('【Bivox】お問い合わせ');
  const body = encodeURIComponent(
    '＜お問い合わせ内容をご記入ください＞\n\n\n' +
    '---\n' +
    `端末: ${navigator.userAgent}\n`
  );
  window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
}

export default function HelpPage() {
  return (
    <MobileLayout showBottomNav={true} activeTab="help" requireAuth={true}>
      <PageHeader
        title="ヘルプ"
        backLink="/"
        backLabel="ホーム"
        gradient="bg-white border-b border-gray-100"
        titleClassName="text-[#3E2723]"
        backLinkClassName="text-[#5D4037] hover:text-[#3E2723]"
      />

      <div className="pb-6">
        {/* ========== 学習の始め方 ========== */}
        <SectionHeader title="学習の始め方" />
        <HelpCard icon={<IconBook />} title="学習の流れ">
          <div className="space-y-3">
            <div>
              <h3 className="font-bold text-gray-800 text-sm mb-1">1. 学年を選ぶ</h3>
              <p className="text-xs text-gray-600">
                ホーム画面から「中学1年」「中学2年」「中学3年」「全学年」を選択します。
              </p>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-sm mb-1">2. パートを選ぶ</h3>
              <p className="text-xs text-gray-600">
                文法テーマごとに分かれたパートから学習したいものを選びます。シャッフル切り替えで問題をランダム順にしたり、「まとめて練習」で複数パートをまとめて学習することもできます。
              </p>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-sm mb-1">3. モードを選ぶ</h3>
              <p className="text-xs text-gray-600">
                ベーシック・スピーキング・AI応用ドリルの3つのモードから選択してトレーニングを開始します。
              </p>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-sm mb-1">4. 結果を確認</h3>
              <p className="text-xs text-gray-600">
                全問終了後、成績と練習した文章の一覧が表示されます。
              </p>
            </div>
          </div>
        </HelpCard>

        {/* ========== トレーニングモード ========== */}
        <SectionHeader title="トレーニングモード" />
        <HelpCard icon={<IconHeadphones />} title="4つのモード">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-gray-800 text-sm">ベーシックモード</h3>
                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">無料</span>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Plus</span>
                <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">Pro</span>
              </div>
              <p className="text-xs text-gray-600 mb-1">
                日本語を聞く → ポーズ中に英語を話す → 英語の正解を聞く、の流れで自動進行します。
              </p>
              <ul className="text-xs text-gray-500 space-y-0.5 ml-3">
                <li>・ ポーズ時間の調整（1〜10秒）</li>
                <li>・ 英語の再生速度（遅い / 等速 / 速い）</li>
                <li>・ 次の問題までの間隔の調整</li>
              </ul>
            </div>

            <div className="border-t border-gray-100 pt-3">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-gray-800 text-sm">スピーキングモード</h3>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Plus</span>
                <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">Pro</span>
              </div>
              <p className="text-xs text-gray-600 mb-1">
                日本語を聞いた後、マイクに向かって英語で回答。AIが自動で採点し、詳細なフィードバックを返します。
              </p>
              <ul className="text-xs text-gray-500 space-y-0.5 ml-3">
                <li>・ スコア・文法・意味の自動判定</li>
                <li>・ 模範解答と自然な表現の提示</li>
                <li>・ 間違えた場合はリトライ可能</li>
              </ul>
            </div>

            <div className="border-t border-gray-100 pt-3">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-gray-800 text-sm">AI応用ドリル</h3>
                <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">Pro</span>
              </div>
              <p className="text-xs text-gray-600">
                AIがパートの文法テーマに合わせて10問を自動生成。教科書にない応用問題で実力を試せます。音声入力で回答し、AIが採点します。
              </p>
            </div>

            <div className="border-t border-gray-100 pt-3">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-gray-800 text-sm">AIフリー英会話</h3>
                <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">Pro</span>
              </div>
              <p className="text-xs text-gray-600 mb-1">
                ホーム画面の「AIとフリー英会話」から開始。AIとチャット形式で自由に英会話ができます。
              </p>
              <ul className="text-xs text-gray-500 space-y-0.5 ml-3">
                <li>・ 難易度の選択（初級 / 中級 / 上級）</li>
                <li>・ 添削モード（リアルタイム / まとめて / なし）</li>
                <li>・ 音声入力・音声読み上げ対応</li>
              </ul>
            </div>
          </div>
        </HelpCard>

        {/* ========== 音声機能 ========== */}
        <SectionHeader title="音声機能" />
        <HelpCard icon={<IconMic />} title="音声の使い方">
          <div className="space-y-3">
            <div>
              <h3 className="font-bold text-gray-800 text-sm mb-1">音声再生</h3>
              <p className="text-xs text-gray-600 mb-1">
                日本語・英語ともにMP3音声で再生されます。ベーシックモードでは再生速度を3段階で調整できます。
              </p>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-sm mb-1">音声入力（スピーキング / AI応用ドリル）</h3>
              <p className="text-xs text-gray-600 mb-1">
                音声認識機能を使って英語を入力します。初回使用時にマイクのアクセス許可が求められます。
              </p>
              <ul className="text-xs text-gray-500 space-y-0.5 ml-3">
                <li>・ 静かな環境での使用を推奨</li>
                <li>・ はっきりと発音するとより正確に認識されます</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-sm mb-1">バックグラウンド再生</h3>
              <p className="text-xs text-gray-600">
                Plus / Proプランでは、ベーシックモードを画面を閉じたまま流し聞きできます。ロック画面からの再生操作にも対応しています。
              </p>
            </div>
          </div>
        </HelpCard>

        {/* ========== 学習記録 ========== */}
        <SectionHeader title="学習記録" />
        <HelpCard icon={<IconChart />} title="学習ログ">
          <div className="space-y-3">
            <div>
              <h3 className="font-bold text-gray-800 text-sm mb-1">連続学習日数（ストリーク）</h3>
              <p className="text-xs text-gray-600">
                毎日学習を続けると連続日数がカウントされます。最長記録も保存されます。
              </p>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-sm mb-1">学習統計</h3>
              <p className="text-xs text-gray-600">
                総学習日数、解いた問題数、セッション数を確認できます。
              </p>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-sm mb-1">カレンダー</h3>
              <p className="text-xs text-gray-600">
                月ごとに学習した日が色付きで表示されます。日付をタップすると、その日の学習内容を確認できます。
              </p>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-sm mb-1">学習時間グラフ</h3>
              <p className="text-xs text-gray-600">
                1週間 / 1ヶ月 / 6ヶ月 / 1年 / 全期間の学習時間を棒グラフで確認できます。
              </p>
            </div>
          </div>
        </HelpCard>

        {/* ========== ライフシステム ========== */}
        <SectionHeader title="ライフシステム" />
        <HelpCard icon={<IconHeart />} title="ライフについて">
          <div className="space-y-3">
            <div>
              <h3 className="font-bold text-gray-800 text-sm mb-1">ライフとは？</h3>
              <p className="text-xs text-gray-600">
                Freeプランでは、1問ごとにライフが1つ消費されます。ライフが0になるとトレーニングが一時停止します。
              </p>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-sm mb-1">ライフの回復</h3>
              <p className="text-xs text-gray-600">
                48分ごとに1ライフが自動回復します（最大30ライフ）。回復までの残り時間は画面上部で確認できます。
              </p>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-sm mb-1">ライフ無制限</h3>
              <p className="text-xs text-gray-600">
                Plus・Proプランではライフが無制限になり、好きなだけ学習できます。
              </p>
            </div>
          </div>
        </HelpCard>

        {/* ========== プラン ========== */}
        <SectionHeader title="プラン" />
        <HelpCard icon={<IconCrown />} title="料金プラン">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-gray-800 text-sm">Free（無料）</h3>
              </div>
              <ul className="text-xs text-gray-500 space-y-0.5 ml-3">
                <li>・ ベーシックモード</li>
                <li>・ ライフ制限あり（最大30 / 48分で1回復）</li>
                <li>・ 広告表示あり</li>
              </ul>
            </div>
            <div className="border-t border-gray-100 pt-3">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-gray-800 text-sm">Plus</h3>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">月額800円</span>
              </div>
              <ul className="text-xs text-gray-500 space-y-0.5 ml-3">
                <li>・ Freeの全機能</li>
                <li>・ スピーキングモード（50回/日）</li>
                <li>・ ライフ無制限</li>
                <li>・ 広告非表示</li>
                <li>・ バックグラウンド再生</li>
              </ul>
            </div>
            <div className="border-t border-gray-100 pt-3">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-gray-800 text-sm">Pro</h3>
                <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">月額1,480円</span>
              </div>
              <ul className="text-xs text-gray-500 space-y-0.5 ml-3">
                <li>・ Plusの全機能</li>
                <li>・ スピーキングモード無制限</li>
                <li>・ AI応用ドリル（100回/日）</li>
                <li>・ AIフリー英会話（100回/日）</li>
              </ul>
            </div>
          </div>
        </HelpCard>

        {/* ========== 設定 ========== */}
        <SectionHeader title="カスタマイズ" />
        <HelpCard icon={<IconGear />} title="設定項目">
          <div className="space-y-3">
            <div>
              <h3 className="font-bold text-gray-800 text-sm mb-1">ベーシックモード設定</h3>
              <p className="text-xs text-gray-600">
                ポーズ時間・英語再生速度・次の問題までの間隔をトレーニング画面の歯車アイコンから調整できます。設定は自動保存されます。
              </p>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-sm mb-1">データバックアップ</h3>
              <p className="text-xs text-gray-600">
                設定画面から学習データのバックアップを作成できます。「バックアップを作成」をタップすると共有メニューが開き、Googleドライブやメールなどお好みの保存先に送れます。復元時は保存したファイルを「バックアップから復元」で読み込みます。機種変更時やデータ消失に備えて定期的にバックアップを取ることをおすすめします。
              </p>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-sm mb-1">アカウント管理</h3>
              <p className="text-xs text-gray-600">
                メールアドレスの変更、パスワードの変更、ログアウトは設定画面から行えます。
              </p>
            </div>
          </div>
        </HelpCard>

        {/* ========== FAQ ========== */}
        <SectionHeader title="よくある質問" />
        <HelpCard icon={<IconQuestion />} title="FAQ">
          <div className="space-y-3">
            <div>
              <h3 className="font-bold text-gray-800 text-sm mb-1">音声認識が動作しない</h3>
              <p className="text-xs text-gray-600">
                設定アプリからBivoxのマイク権限が許可されているか確認してください。それでも動作しない場合はアプリを再起動してお試しください。
              </p>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-sm mb-1">ライフが足りない</h3>
              <p className="text-xs text-gray-600">
                48分ごとに1ライフ自動回復します。広告を見て5ライフ回復することもできます。学習ログ画面で回復状況を確認できます。Plus・Proプランではライフが無制限です。
              </p>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-sm mb-1">バックグラウンドで音が止まる</h3>
              <p className="text-xs text-gray-600">
                バックグラウンド再生はPlus / Proプランの機能です。Freeプランでは画面を閉じると再生が一時停止します。
              </p>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-sm mb-1">データが消えてしまった</h3>
              <p className="text-xs text-gray-600">
                学習データはお使いの端末に保存されています。ブラウザのデータ削除やキャッシュクリアで消える可能性があるため、設定画面から定期的にバックアップを取ってください。
              </p>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-sm mb-1">オフラインで使える？</h3>
              <p className="text-xs text-gray-600">
                ベーシックモードはオフラインでも利用可能です。スピーキング・AI応用ドリル・AIフリー英会話はインターネット接続が必要です。
              </p>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-sm mb-1">問題生成や解説・音声に時間がかかる</h3>
              <p className="text-xs text-gray-600">
                AI応用ドリルの問題生成、スピーキングモードの解説作成、音声の読み上げなどはサーバーで処理を行うため、通信状況やサーバーの混雑状況によって数秒〜数分かかることがあります。処理中は画面を閉じずにお待ちください。
              </p>
            </div>
          </div>
        </HelpCard>

        {/* ========== 学習のコツ ========== */}
        <SectionHeader title="ヒント" />
        <HelpCard icon={<IconTip />} title="学習のコツ">
          <ul className="text-xs text-gray-600 space-y-2.5">
            <CheckItem>毎日少しずつでも続けることが大切</CheckItem>
            <CheckItem>まずはベーシックモードで耳と口を慣らす</CheckItem>
            <CheckItem>慣れてきたらスピーキングモードでAI採点に挑戦</CheckItem>
            <CheckItem>ポーズ中に声に出すことでスピーキング力UP</CheckItem>
            <CheckItem>通勤・通学中はバックグラウンド再生で流し聞き</CheckItem>
          </ul>
        </HelpCard>

        {/* ========== お問い合わせ ========== */}
        <SectionHeader title="サポート" />
        <div className="mx-4 mb-2">
          <button
            onClick={openContactEmail}
            className="w-full flex items-center gap-3 px-5 py-4 bg-white rounded-2xl shadow-[0_4px_10px_rgba(0,0,0,0.05)] active:scale-[0.98] transition-transform"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F8F6F4]">
              <svg className="w-5 h-5 text-[#6D4C41]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-[#3E2723]">お問い合わせ</p>
              <p className="text-[11px] text-gray-500">解決しない場合はお気軽にご連絡ください</p>
            </div>
            <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

    </MobileLayout>
  );
}
