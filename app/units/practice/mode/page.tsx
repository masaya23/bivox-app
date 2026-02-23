'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { TabFilter } from '@/types/unit';
import { GRADE_THEMES } from '@/utils/gradeTheme';
import ModeSelectCard from '@/components/train/ModeSelectCard';

function AllUnitsPracticeModeSelectPageContent() {
  const searchParams = useSearchParams();

  const filter = (searchParams.get('filter') || 'all') as TabFilter;
  const count = searchParams.get('count') || '10';
  const seed = searchParams.get('seed') || '0';
  const shuffleMode = true;

  const baseHref = `/units/practice?filter=${filter}&count=${count}&shuffle=${shuffleMode}&seed=${seed}`;

  return (
    <div className="min-h-screen bg-gray-200 flex justify-center">
      <div className="w-full max-w-[430px] bg-gray-50 min-h-screen shadow-xl">
        <div className={`p-4 bg-gradient-to-r ${GRADE_THEMES[filter].gradient}`}>
          <div className="flex items-center justify-between">
            <a
              href={`/units/practice/select?filter=${filter}&shuffle=${shuffleMode}&seed=${seed}`}
              className="text-white/80 hover:text-white font-semibold text-sm"
            >
              &larr;戻る
            </a>
            <div className="min-w-[60px]" />
          </div>
          <h1 className="text-xl font-black text-white text-center mt-2">
            学習モードを選択
          </h1>
        </div>

        <div className="px-4 py-4">
          {/* モード選択カード */}
          <div className="space-y-4">
            {/* ベーシックモード */}
            <ModeSelectCard
              mode="shadowing"
              href={`${baseHref}&mode=shadowing`}
              icon="BS"
              iconBg="bg-green-500"
              title="ベーシックモード"
              description="音声を聞いて真似する\n基本トレーニング"
              features={[
                '日本語 → 一時停止 → 英語音声',
                '一時停止の間に声に出して英作文する',
                '「分かる」から「出来る」に',
              ]}
              gradient="bg-green-50"
              borderColor="border-green-200"
              accentColor="text-green-600"
            />

            {/* スピーキングモード */}
            <ModeSelectCard
              mode="speaking"
              href={`${baseHref}&mode=speaking`}
              icon="SP"
              iconBg="bg-orange-500"
              title="スピーキングモード"
              description="音声入力で自動判定し間違いは\n解説してくれるモード"
              features={[
                '日本語 → 音声入力 → 自動判定',
                '間違いの分析と解説',
                'より理解力を深める',
              ]}
              gradient="bg-orange-50"
              borderColor="border-orange-200"
              accentColor="text-orange-600"
            />

            {/* AI応用ドリルモード */}
            <ModeSelectCard
              mode="ai-drill"
              href={`${baseHref}&mode=ai-drill`}
              icon="AI"
              iconBg="bg-purple-500"
              title="AI応用ドリル"
              description="問題はAIが生成する問題で\n応用力を鍛える"
              features={[
                'スピーキングモードの応用',
                '同じ文法レベルで新問題生成',
                'AIの出題によりマンネリを防ぐ',
              ]}
              gradient="bg-purple-50"
              borderColor="border-purple-200"
              accentColor="text-purple-600"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AllUnitsPracticeModeSelectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-200 flex justify-center">
        <div className="w-full max-w-[430px] bg-gray-50 min-h-screen shadow-xl flex items-center justify-center">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </div>
    }>
      <AllUnitsPracticeModeSelectPageContent />
    </Suspense>
  );
}
