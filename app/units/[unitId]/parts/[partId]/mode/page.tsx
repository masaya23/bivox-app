/* eslint-disable @next/next/no-html-link-for-pages */
'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import HardNavLink from '@/components/HardNavLink';
import { getUnitById, getPartById } from '@/utils/units';
import ModeSelectList from '@/components/train/ModeSelectList';

// unitIdから学年を判定
function getGradeFromUnitId(unitId: string): string {
  if (unitId === 'unit1') return 'junior-high-1';
  if (unitId === 'unit2') return 'junior-high-2';
  if (unitId === 'unit3') return 'junior-high-3';
  return 'junior-high-1';
}

// 学年に応じたカラー（ホーム画面のボタンと統一）
function getGradientForGrade(grade: string): { gradient: string; bgGradient: string } {
  switch (grade) {
    case 'junior-high-1':
      return { gradient: 'from-[#1E90FF] to-[#1E90FF]', bgGradient: 'from-[#E8F4FD] to-[#E8F4FD]' };
    case 'junior-high-2':
      return { gradient: 'from-[#2ECC71] to-[#2ECC71]', bgGradient: 'from-[#E8F8F0] to-[#E8F8F0]' };
    case 'junior-high-3':
      return { gradient: 'from-[#FF4757] to-[#FF4757]', bgGradient: 'from-[#FDE8EA] to-[#FDE8EA]' };
    case 'all':
      return { gradient: 'from-[#3949AB] to-[#3949AB]', bgGradient: 'from-[#E8EAF6] to-[#E8EAF6]' };
    default:
      return { gradient: 'from-[#1E90FF] to-[#1E90FF]', bgGradient: 'from-[#E8F4FD] to-[#E8F4FD]' };
  }
}

function PartPracticeModeSelectContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const unitId = params.unitId as string;
  const partId = params.partId as string;
  const shuffleMode = searchParams.get('shuffle') === 'true';
  const gradeParam = searchParams.get('grade') || '';

  const unit = getUnitById(unitId);
  const part = unit ? getPartById(unitId, partId) : undefined;

  // 戻り先を決定
  const grade = gradeParam || getGradeFromUnitId(unitId);
  const backLink = `/units?grade=${grade}`;
  const colors = getGradientForGrade(grade);

  if (!unit || !part) {
    return (
      <div className="min-h-screen bg-gray-200 flex justify-center">
        <div className={`w-full max-w-[430px] min-h-screen shadow-xl bg-gradient-to-br ${colors.bgGradient}`}>
          <div className={`p-4 bg-gradient-to-r ${colors.gradient}`}>
            <a href="/units" className="text-white/80 hover:text-white font-medium text-sm">
              ← 戻る
            </a>
            <h1 className="text-2xl font-black text-white text-center mt-2">
              モード選択
            </h1>
          </div>
          <div className="px-4 py-8">
            <div className="bg-white rounded-3xl shadow-xl p-8 text-center border-4 border-white/50">
              <div className="text-4xl mb-4">!</div>
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Partが見つかりません
              </h2>
              <a
                href="/units"
                className={`inline-block px-6 py-3 bg-gradient-to-r ${colors.gradient} text-white font-bold rounded-2xl`}
              >
                ← Part一覧に戻る
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-200 flex justify-center">
      <div className={`w-full max-w-[430px] min-h-screen shadow-xl bg-gradient-to-br ${colors.bgGradient}`}>
        {/* ヘッダー */}
        <div className={`p-4 bg-gradient-to-r ${colors.gradient}`}>
          <div className="flex items-center justify-between">
            <HardNavLink href={backLink} className="text-white/80 hover:text-white font-medium text-sm">
              ← 戻る
            </HardNavLink>
          </div>
          <h1 className="text-2xl font-black text-white text-center mt-2">
            モード選択
          </h1>
        </div>

        <div className="px-4 py-6">
          {/* Part情報カード */}
          <div className="bg-white rounded-3xl shadow-xl p-6 mb-5 border-4 border-white/50 text-center">
            <p className="text-sm text-gray-500 mb-1">Part {part.partNumber}</p>
            <h2 className="text-xl font-black text-gray-800 whitespace-pre-line">{part.title}</h2>
            <p className={`inline-block mt-3 px-4 py-1.5 bg-gradient-to-r ${colors.gradient} text-white text-sm font-bold rounded-full`}>
              {part.sentences.length}問
            </p>
          </div>

          {/* モード選択カード */}
          <div className="bg-white rounded-3xl shadow-xl p-5 border-4 border-white/50">
            <h3 className="text-lg font-black text-gray-800 mb-4 text-center">
              学習モードを選択
            </h3>
            <ModeSelectList
              unitId={unit.id}
              partId={part.id}
              shuffleMode={shuffleMode}
              grade={grade}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PartPracticeModeSelectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-200 flex justify-center">
        <div className="w-full max-w-[430px] min-h-screen shadow-xl bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    }>
      <PartPracticeModeSelectContent />
    </Suspense>
  );
}

