'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import HardNavLink from '@/components/HardNavLink';
import {
  getPartsByGrade,
  getUnitIdByGrade,
} from '@/utils/units';
import { GRADE_TABS, getPartBadgeClassName, isGradeId } from '@/utils/gradeTheme';
import type { TabFilter } from '@/types/unit';

const isValidGrade = (grade: string | null): grade is TabFilter => isGradeId(grade);

function UnitsPageContent() {
  const searchParams = useSearchParams();
  const gradeParam = searchParams.get('grade');
  const initialGrade: TabFilter = isValidGrade(gradeParam) ? gradeParam : 'junior-high-1';

  const [activeTab, setActiveTab] = useState<TabFilter>(initialGrade);
  const [shuffleMode, setShuffleMode] = useState(false);

  useEffect(() => {
    if (isValidGrade(gradeParam)) {
      setActiveTab(gradeParam);
    }
  }, [gradeParam]);

  const parts = getPartsByGrade(activeTab);
  const currentUnitId = getUnitIdByGrade(activeTab);
  const currentTabInfo = GRADE_TABS.find((tab) => tab.id === activeTab) || GRADE_TABS[0];
  const totalSentences = parts.reduce((sum, part) => sum + part.sentences.length, 0);

  const getGradeFromPartId = (partId: string): string => {
    if (partId.startsWith('unit1')) return 'unit1';
    if (partId.startsWith('unit2')) return 'unit2';
    if (partId.startsWith('unit3')) return 'unit3';
    return currentUnitId || 'unit1';
  };

  const getGradeLabelFromPartId = (partId: string): string => {
    if (partId.startsWith('unit1')) return '中1';
    if (partId.startsWith('unit2')) return '中2';
    if (partId.startsWith('unit3')) return '中3';
    return '';
  };

  return (
    <div className="min-h-screen bg-gray-200 flex justify-center">
      <div className="w-full max-w-[430px] bg-gray-50 min-h-screen shadow-xl">
        {/* ヘッダー */}
        <div className={`p-4 bg-gradient-to-r ${currentTabInfo.gradient}`}>
          <div className="flex items-center justify-between">
            <HardNavLink href="/" className="text-white/80 hover:text-white font-medium text-sm">
              ← ホーム
            </HardNavLink>
          </div>
          <h1 className="text-2xl font-black text-white text-center mt-2">
            {currentTabInfo.label}
          </h1>
        </div>

        <div className="px-4 py-4">
        {/* まとめて練習ボタン */}
        {totalSentences > 0 && (
          <HardNavLink
            href={
              activeTab === 'all'
                ? '/units/practice/select?filter=all&shuffle=true'
                : `/units/${currentUnitId}/practice/select?shuffle=true`
            }
            className={`block rounded-2xl p-4 mb-4 shadow-md transition-all active:scale-[0.98] bg-gradient-to-r ${currentTabInfo.gradient} text-white`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 bg-white/20 rounded-full text-xs font-bold">
                    シャッフル
                  </span>
                  <span className="text-white/80 text-xs">{totalSentences}問</span>
                </div>
                <h2 className="text-lg font-black">まとめて練習</h2>
                <p className="text-xs text-white/80 mt-0.5">
                  {activeTab === 'all'
                    ? '全学年のPartをまとめて'
                    : `${currentTabInfo.label}の全Partを`}
                </p>
              </div>
              <div className="text-2xl ml-3">→</div>
            </div>
          </HardNavLink>
        )}

        {/* Part一覧セクション */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-black text-gray-800">Part一覧</h3>
          <span className="px-2.5 py-0.5 bg-gray-200 text-gray-600 text-xs font-bold rounded-full">
            {parts.length} Part
          </span>
        </div>

        {/* シャッフル設定 */}
        <div className="bg-white rounded-2xl shadow-md p-4 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-700 font-bold text-sm">問題をシャッフルする</span>
            <button
              onClick={() => setShuffleMode(!shuffleMode)}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                shuffleMode ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <div
                className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform shadow-md ${
                  shuffleMode ? 'transform translate-x-5' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Part一覧 */}
        <div className="space-y-3">
          {parts.length === 0 ? (
            <div className="text-center text-gray-500 py-8 bg-white rounded-2xl shadow-md">
              この学年のデータがありません
            </div>
          ) : (
            parts.map((part, index) => {
              const partUnitId =
                activeTab === 'all' ? getGradeFromPartId(part.id) : currentUnitId;
              // 全学年モードでは通し番号を使用
              const displayPartNumber = activeTab === 'all' ? index + 1 : part.partNumber;

              return (
                <HardNavLink
                  key={part.id}
                  href={`/units/${partUnitId}/parts/${part.id}/mode?shuffle=${shuffleMode}&from=units&grade=${activeTab}`}
                  className="block bg-white rounded-2xl p-4 active:scale-[0.98] transition-transform shadow-md"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <span className={getPartBadgeClassName(activeTab)}>
                          Part {displayPartNumber}
                        </span>
                        {activeTab === 'all' && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                            {getGradeLabelFromPartId(part.id)}
                          </span>
                        )}
                        <span className="text-gray-400 text-xs">
                          {part.sentences.length}問
                        </span>
                        {part.priority && (
                          <span
                            className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                              part.priority === 'A'
                                ? 'bg-red-100 text-red-700'
                                : part.priority === 'B'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {part.priority === 'A'
                              ? '重要'
                              : part.priority === 'B'
                              ? '標準'
                              : '補足'}
                          </span>
                        )}
                      </div>
                      <h2 className="text-sm font-bold text-gray-800 truncate">{part.title}</h2>
                      <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">
                        {part.description}
                      </p>
                    </div>
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-r ${currentTabInfo.gradient} flex items-center justify-center text-white font-bold flex-shrink-0 text-sm`}>
                      →
                    </div>
                  </div>
                </HardNavLink>
              );
            })
          )}
        </div>
        </div>
      </div>
    </div>
  );
}

export default function UnitsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-200 flex justify-center">
        <div className="w-full max-w-[430px] bg-gray-50 min-h-screen shadow-xl">
          <div className="p-4 bg-gradient-to-r from-blue-500 to-sky-500">
            <HardNavLink href="/" className="text-white/80 hover:text-white font-medium text-sm">
              ← ホーム
            </HardNavLink>
            <h1 className="text-2xl font-black text-white text-center mt-2">
              読み込み中...
            </h1>
          </div>
          <div className="px-4 py-8 text-center text-gray-500">
            読み込み中...
          </div>
        </div>
      </div>
    }>
      <UnitsPageContent />
    </Suspense>
  );
}
