'use client';

import { useState } from 'react';
import HardNavLink from '@/components/HardNavLink';
import {
  getUnitsByFilter,
  getUnitTotalSentences,
  getPartsByGrade,
  getUnitByGrade,
  getUnitIdByGrade,
} from '@/utils/units';
import type { TabFilter } from '@/types/unit';

const GRADE_TABS: { id: TabFilter; label: string; accent: string }[] = [
  { id: 'junior-high-1', label: '中学1年', accent: 'from-blue-500 to-sky-500' },
  { id: 'junior-high-2', label: '中学2年', accent: 'from-indigo-500 to-purple-500' },
  { id: 'junior-high-3', label: '中学3年', accent: 'from-pink-500 to-rose-500' },
  { id: 'all', label: '全学年', accent: 'from-emerald-500 to-teal-500' },
];

export default function UnitsPage() {
  const [activeTab, setActiveTab] = useState<TabFilter>('junior-high-1');
  const [shuffleMode, setShuffleMode] = useState(false);

  const parts = getPartsByGrade(activeTab);
  const currentUnitId = getUnitIdByGrade(activeTab);
  const currentTabInfo = GRADE_TABS.find((tab) => tab.id === activeTab) || GRADE_TABS[0];

  // 選択中の学年の総問題数を計算
  const totalSentences = parts.reduce((sum, part) => sum + part.sentences.length, 0);

  // Part IDから学年を判定する関数
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
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 p-4">
      <div className="max-w-5xl mx-auto">
        {/* ヘッダー */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <HardNavLink
              href="/"
              className="text-gray-600 hover:text-gray-800 font-semibold"
            >
              ← ホーム
            </HardNavLink>
            <div className="text-center flex-1">
              <h1 className="text-3xl font-black text-gray-800">学年別練習</h1>
              <p className="text-gray-600 text-sm mt-1">
                学年を選んでPartを練習しましょう
              </p>
            </div>
            <div className="w-20"></div>
          </div>

          {/* 学年タブ */}
          <div className="flex flex-wrap gap-2 justify-center mb-4">
            {GRADE_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
                  activeTab === tab.id
                    ? `bg-gradient-to-r ${tab.accent} text-white shadow-lg scale-105`
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* シャッフルモード切り替え */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <span className="text-gray-700 font-semibold">問題をシャッフルする</span>
            <button
              onClick={() => setShuffleMode(!shuffleMode)}
              className={`relative w-14 h-8 rounded-full transition-colors ${
                shuffleMode ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <div
                className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                  shuffleMode ? 'transform translate-x-6' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* まとめて練習ボタン */}
        {totalSentences > 0 && (
          <HardNavLink
            href={
              activeTab === 'all'
                ? `/units/practice/select?filter=all&shuffle=${shuffleMode}`
                : `/units/${currentUnitId}/practice/select?shuffle=${shuffleMode}`
            }
            className={`block rounded-2xl p-5 mb-6 shadow-xl transition-all transform hover:scale-[1.02] bg-gradient-to-r ${currentTabInfo.accent} text-white hover:shadow-2xl`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-white/20 rounded text-xs font-semibold">
                    {shuffleMode ? 'シャッフル' : '順番通り'}
                  </span>
                  <span className="text-white/80 text-sm">{totalSentences}問</span>
                </div>
                <h2 className="text-2xl font-black">{currentTabInfo.label}をまとめて練習</h2>
                <p className="text-sm text-white/80 mt-1">
                  {activeTab === 'all'
                    ? '全学年のPartをまとめて練習'
                    : `${currentTabInfo.label}の全Partをまとめて練習`}
                </p>
              </div>
              <div className="text-4xl">→</div>
            </div>
          </HardNavLink>
        )}

        {/* Part一覧セクション */}
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-white font-bold text-lg">Part一覧</h3>
          <div className="flex-1 h-px bg-white/30"></div>
          <span className="text-white/70 text-sm">{parts.length} Part</span>
        </div>

        {/* Part一覧 */}
        <div className="space-y-3">
          {parts.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-6 text-center text-gray-700">
              この学年のデータがありません
            </div>
          ) : (
            parts.map((part) => {
              // 全学年モードの場合はPartからUnit IDを取得する
              const partUnitId =
                activeTab === 'all' ? getGradeFromPartId(part.id) : currentUnitId;

              return (
                <HardNavLink
                  key={part.id}
                  href={`/units/${partUnitId}/parts/${part.id}/mode?shuffle=${shuffleMode}`}
                  className="block bg-white rounded-2xl shadow-lg p-5 hover:shadow-xl transition-all hover:scale-[1.01]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded">
                          Part {part.partNumber}
                        </span>
                        {activeTab === 'all' && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded">
                            {getGradeLabelFromPartId(part.id)}
                          </span>
                        )}
                        <span className="text-gray-400 text-sm">
                          {part.sentences.length}問
                        </span>
                        {part.priority && (
                          <span
                            className={`px-2 py-0.5 text-xs font-bold rounded ${
                              part.priority === 'A'
                                ? 'bg-red-100 text-red-700'
                                : part.priority === 'B'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-700'
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
                      <h2 className="text-lg font-bold text-gray-800">{part.title}</h2>
                      <p className="text-gray-500 text-sm mt-1 line-clamp-1">
                        {part.description}
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
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
  );
}
