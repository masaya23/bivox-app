'use client';

/* eslint-disable @next/next/no-html-link-for-pages */

import { Suspense, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { getUnitById } from '@/utils/units';
import { GRADE_THEMES } from '@/utils/gradeTheme';
import ModeSelectCard from '@/components/train/ModeSelectCard';
import { warmupServer } from '@/utils/serverWarmup';
import { useAppRouter } from '@/hooks/useAppRouter';
import { useAuth } from '@/contexts/AuthContext';
import { isGuestUser } from '@/utils/guestAccess';

function UnitPracticeModeSelectPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useAppRouter();
  const { user } = useAuth();

  const unitId = params.unitId as string;

  useEffect(() => { warmupServer(); }, []);
  useEffect(() => {
    if (isGuestUser(user)) {
      router.replace('/auth/register');
    }
  }, [router, user]);
  const count = searchParams.get('count') || '10';
  const seed = searchParams.get('seed') || '0';
  const shuffleMode = true;

  if (isGuestUser(user)) {
    return null;
  }

  const unit = getUnitById(unitId);

  if (!unit) {
    return (
      <div className="min-h-screen bg-gray-200 flex justify-center">
        <div className="w-full max-w-[430px] bg-gray-50 min-h-screen shadow-xl flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 text-center w-full">
            <h1 className="text-2xl font-black text-gray-800 mb-4">
              Unitが見つかりません
            </h1>
            <a href="/units" className="text-blue-500 hover:text-blue-700 font-semibold">
              &larr; Unit一覧に戻る
            </a>
          </div>
        </div>
      </div>
    );
  }

  const baseHref = `/units/${unit.id}/practice?count=${count}&shuffle=${shuffleMode}&seed=${seed}`;

  return (
    <div className="min-h-screen bg-gray-200 flex justify-center">
      <div className="w-full max-w-[430px] bg-gray-50 min-h-screen shadow-xl">
        <div className={`p-4 bg-gradient-to-r ${GRADE_THEMES[unit.grade].gradient}`}>
          <div className="flex items-center justify-between">
            <a
              href={`/units/${unit.id}/practice/select?shuffle=${shuffleMode}&seed=${seed}`}
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

export default function UnitPracticeModeSelectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-200 flex justify-center">
        <div className="w-full max-w-[430px] bg-gray-50 min-h-screen shadow-xl flex items-center justify-center">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </div>
    }>
      <UnitPracticeModeSelectPageContent />
    </Suspense>
  );
}
