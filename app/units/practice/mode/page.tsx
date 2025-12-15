import { TabFilter } from '@/types/unit';

export default async function AllUnitsPracticeModeSelectPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; count?: string; shuffle?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const filter = (resolvedSearchParams.filter || 'all') as TabFilter;
  const count = resolvedSearchParams.count || '10';
  const shuffleMode =
    resolvedSearchParams.shuffle === 'false'
      ? false
      : resolvedSearchParams.shuffle === 'true'
        ? true
        : true;

  const getFilterName = (f: TabFilter): string => {
    const names: Record<TabFilter, string> = {
      all: '全学年',
      'junior-high-1': '中学1年',
      'junior-high-2': '中学2年',
      'junior-high-3': '中学3年',
    };
    return names[f];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl p-8 md:p-12">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-black text-gray-800 mb-4">
            トレーニングモード選択
          </h1>
          <p className="text-lg text-gray-600">
            {getFilterName(filter)} - {count}問
          </p>
        </div>

        {/* モード選択カード */}
        <div className="space-y-4 mb-8">
          <a
            href={`/units/practice?filter=${filter}&count=${count}&shuffle=${shuffleMode}&mode=shadowing`}
            className="block p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl border-2 border-green-200 hover:border-green-400 transition-all transform hover:scale-105"
          >
            <div className="flex items-start gap-4">
              <div className="text-2xl font-black text-green-700">SH</div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">シャドーイングモード</h2>
                <p className="text-gray-600 mb-3">音声を聞いて真似する基本トレーニング</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-green-600">✓</span>
                    <span>日本語音声 → 一時停止 → 英語音声</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-green-600">✓</span>
                    <span>自分のペースで練習できる</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-green-600">✓</span>
                    <span>初心者におすすめ</span>
                  </div>
                </div>
              </div>
              <div className="text-gray-400 text-3xl">→</div>
            </div>
          </a>

          <a
            href={`/units/practice?filter=${filter}&count=${count}&shuffle=${shuffleMode}&mode=speaking`}
            className="block p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border-2 border-purple-200 hover:border-purple-400 transition-all transform hover:scale-105"
          >
            <div className="flex items-start gap-4">
              <div className="text-2xl font-black text-purple-700">SP</div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">スピーキングモード</h2>
                <p className="text-gray-600 mb-3">音声入力で自動判定する実践トレーニング</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-purple-600">✓</span>
                    <span>日本語音声 → 音声入力 → 自動判定</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-purple-600">✓</span>
                    <span>発音の正確さをチェック</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-purple-600">✓</span>
                    <span>中級者以上におすすめ</span>
                  </div>
                </div>
              </div>
              <div className="text-gray-400 text-3xl">→</div>
            </div>
          </a>
        </div>

        <a
          href={`/units/practice/select?filter=${filter}&shuffle=${shuffleMode}`}
          className="block w-full py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl text-center hover:bg-gray-200 transition-colors"
        >
          ← 問題数選択に戻る
        </a>
      </div>
    </div>
  );
}
