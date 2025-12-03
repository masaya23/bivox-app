'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getAllUnits, getUnitsByFilter, getGradeName, getUnitTotalSentences } from '@/utils/units';
import { TabFilter } from '@/types/unit';

export default function UnitsPage() {
  const [activeTab, setActiveTab] = useState<TabFilter>('all');

  const filteredUnits = getUnitsByFilter(activeTab);

  const tabs: { id: TabFilter; label: string }[] = [
    { id: 'all', label: 'すべて' },
    { id: 'junior-high-1', label: '中1' },
    { id: 'junior-high-2', label: '中2' },
    { id: 'junior-high-3', label: '中3' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 p-4">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-800 font-semibold"
            >
              ← ホーム
            </Link>
            <h1 className="text-3xl font-black text-gray-800">
              Unit学習
            </h1>
            <div className="w-20"></div>
          </div>

          {/* タブ */}
          <div className="flex gap-2 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* すべて練習ボタン（複数Unitがある場合） */}
        {filteredUnits.length > 1 && (
          <div className="mb-6">
            <Link
              href={`/units/practice/select?filter=${activeTab}&shuffle=true`}
              className="block bg-gradient-to-r from-orange-500 to-red-500 text-white text-center py-4 rounded-2xl font-bold text-lg shadow-lg hover:from-orange-600 hover:to-red-600 transition-all transform hover:scale-105"
            >
              {activeTab === 'all' ? 'すべて' : tabs.find(t => t.id === activeTab)?.label}のUnitをまとめて練習 (シャッフル)
            </Link>
          </div>
        )}

        {/* Unitリスト */}
        <div className="space-y-4">
          {filteredUnits.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <p className="text-gray-500 text-lg">
                このカテゴリにはまだUnitがありません
              </p>
            </div>
          ) : (
            filteredUnits.map((unit) => (
              <Link
                key={unit.id}
                href={`/units/${unit.id}`}
                className="block bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all transform hover:scale-105"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                        {getGradeName(unit.grade)}
                      </span>
                      <span className="text-gray-500 text-sm">
                        {unit.parts.length}パート・{getUnitTotalSentences(unit)}問
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-1">
                      {unit.title}
                    </h2>
                    <p className="text-gray-600 text-sm">
                      {unit.description}
                    </p>
                  </div>
                  <div className="text-4xl ml-4">📚</div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
