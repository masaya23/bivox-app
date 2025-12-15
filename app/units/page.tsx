'use client';

import { useState, useEffect } from 'react';
import HardNavLink from '@/components/HardNavLink';
import { getUnitsByFilter, getUnitTotalSentences, getGradeName } from '@/utils/units';
import type { TabFilter } from '@/types/unit';

const GRADE_TABS: { id: TabFilter; label: string }[] = [
  { id: 'all', label: '全学年' },
  { id: 'junior-high-1', label: '中学1年' },
  { id: 'junior-high-2', label: '中学2年' },
  { id: 'junior-high-3', label: '中学3年' },
];

const SHUFFLE_FILTERS: { id: TabFilter; label: string; accent: string }[] = [
  { id: 'all', label: '全Unitをまとめて練習', accent: 'from-emerald-500 to-teal-500' },
  { id: 'junior-high-1', label: '中1 Unitをまとめて練習', accent: 'from-blue-500 to-sky-500' },
  { id: 'junior-high-2', label: '中2 Unitをまとめて練習', accent: 'from-indigo-500 to-purple-500' },
  { id: 'junior-high-3', label: '中3 Unitをまとめて練習', accent: 'from-pink-500 to-rose-500' },
];

export default function UnitsPage() {
  const [activeTab, setActiveTab] = useState<TabFilter>('junior-high-1');
  const [shuffleMode, setShuffleMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getTotalSentencesByFilter = (filter: TabFilter): number =>
    getUnitsByFilter(filter).reduce(
      (total, unit) => total + getUnitTotalSentences(unit),
      0
    );

  const units = getUnitsByFilter(activeTab);

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
              <h1 className="text-3xl font-black text-gray-800">Unit学習</h1>
              <p className="text-gray-600 text-sm mt-1">
                Unitを選んでPart練習、またはまとめて練習を開始できます
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
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md'
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
              className={`relative w-14 h-8 rounded-full transition-colors ${shuffleMode ? 'bg-green-500' : 'bg-gray-300'}`}
            >
              <div
                className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${shuffleMode ? 'transform translate-x-6' : ''}`}
              />
            </button>
          </div>
        </div>

        {/* Unitカード */}
        <div className="space-y-4">
          {units.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-6 text-center text-gray-700">
              この学年のUnitデータがありません
            </div>
          ) : (
            units.map((unit) => {
              const totalSentences = getUnitTotalSentences(unit);
              return (
                <div
                  key={unit.id}
                  className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                          {getGradeName(unit.grade)}
                        </span>
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full">
                          Unit {unit.unitNumber}
                        </span>
                        <span className="text-gray-500 text-sm">
                          {unit.parts.length}パート / {totalSentences}問
                        </span>
                      </div>
                      <h2 className="text-xl font-bold text-gray-800 mb-1">
                        {unit.title}
                      </h2>
                      <p className="text-gray-600 text-sm">
                        {unit.description}
                      </p>
                    </div>
                    <div className="text-3xl text-gray-400">→</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                    <HardNavLink
                      href={`/units/${unit.id}?shuffle=${shuffleMode}`}
                      className="block w-full text-center py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold hover:from-green-600 hover:to-emerald-600 transition-all"
                    >
                      Partを選んで練習
                    </HardNavLink>
                    <HardNavLink
                      href={`/units/${unit.id}/practice/select?shuffle=${shuffleMode}`}
                      className="block w-full text-center py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold hover:from-orange-600 hover:to-red-600 transition-all"
                    >
                      Unitまとめて練習
                    </HardNavLink>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* まとめて練習（学年シャッフル） */}
        <div className="mt-8 space-y-3">
          <h3 className="text-white font-bold text-lg text-center">学年別まとめて練習</h3>
          {SHUFFLE_FILTERS.map((grade) => {
            const total = getTotalSentencesByFilter(grade.id);
            const disabled = total === 0;
            return (
              <HardNavLink
                key={grade.id}
                href={`/units/practice/select?filter=${grade.id}&shuffle=${shuffleMode}`}
                className={`block rounded-2xl p-5 shadow-xl transition-all transform hover:scale-105 ${
                  disabled
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed pointer-events-none'
                    : `bg-gradient-to-r ${grade.accent} text-white hover:shadow-2xl`
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold opacity-80">{shuffleMode ? 'シャッフル出題' : '順番通り出題'}</p>
                    <h2 className="text-2xl font-black mt-1">{grade.label}</h2>
                    <p className="text-sm opacity-80 mt-1">{shuffleMode ? '全問からランダムに出題' : '順番通りに出題'}（{total}問）</p>
                  </div>
                  <div className="text-4xl">{disabled ? '?' : '→'}</div>
                </div>
              </HardNavLink>
            );
          })}
        </div>
      </div>
    </div>
  );
}
