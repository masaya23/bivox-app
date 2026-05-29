'use client';

import { useState, useEffect } from 'react';
import HardNavLink from '@/components/HardNavLink';
import MobileLayout from '@/components/MobileLayout';
import {
  getChartDataByPeriod,
  getTotalLearningTime,
  formatMinutesToDisplay,
  PeriodType,
  ChartDataPoint,
} from '@/utils/learningTime';
import { useAuth } from '@/contexts/AuthContext';
import { useAppRouter } from '@/hooks/useAppRouter';
import { isGuestUser } from '@/utils/guestAccess';

const PERIOD_TABS: { key: PeriodType; label: string }[] = [
  { key: 'week', label: '1週間' },
  { key: 'month', label: '1ヶ月' },
  { key: '6months', label: '6ヶ月' },
  { key: 'year', label: '1年' },
  { key: 'all', label: '全て' },
];

function CssBarChart({ data, period }: { data: ChartDataPoint[]; period: PeriodType }) {
  const [animated, setAnimated] = useState(false);
  const maxMinutes = Math.max(...data.map((d) => d.minutes), 1);
  const lastIndex = data.length - 1;

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 50);
    return () => clearTimeout(t);
  }, []);

  const interval = data.length <= 7 ? 1
    : data.length <= 15 ? 2
    : data.length <= 30 ? 5
    : Math.ceil(data.length / 6);

  return (
    <div className="flex items-end justify-around w-full h-full pb-6 relative">
      {data.map((d, i) => {
        const pct = Math.max((d.minutes / maxMinutes) * 90, d.minutes > 0 ? 3 : 0);
        const isLatest = i === lastIndex;
        const showLabel = i % interval === 0 || i === lastIndex;
        const delay = Math.min(i * 50, 400);
        return (
          <div key={i} className="flex flex-col items-center flex-1 h-full justify-end">
            <div
              style={{
                height: animated ? `${pct}%` : '0%',
                backgroundColor: isLatest ? '#FCC800' : '#FDE68A',
                maxWidth: 32,
                width: '100%',
                borderRadius: '2px 2px 0 0',
                minHeight: 0,
                transition: `height 0.5s ease ${delay}ms`,
              }}
            />
            {showLabel && (
              <span className="absolute bottom-0 text-gray-400" style={{ fontSize: 9 }}>
                {d.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function LearningTimePage() {
  const router = useAppRouter();
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('week');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [mounted, setMounted] = useState(false);
  const isGuest = isGuestUser(user);

  useEffect(() => {
    if (isGuest) {
      router.replace('/auth/register');
      return;
    }
    setMounted(true);
    setChartData(getChartDataByPeriod(selectedPeriod));
    setTotalMinutes(getTotalLearningTime(selectedPeriod));
  }, [isGuest, router, selectedPeriod]);

  if (isGuest) return null;

  const legendLabel = selectedPeriod === '6months' ? '今週'
    : selectedPeriod === 'year' || selectedPeriod === 'all' ? '今月'
    : '今日';

  return (
    <MobileLayout showBottomNav={false} requireAuth={true}>
      {/* ヘッダー */}
      <div className="bg-white px-4 py-4 sticky top-0 z-10 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <HardNavLink
            href="/study-log"
            className="p-2 -ml-2 text-[#5D4037] hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </HardNavLink>
          <h1 className="text-lg font-bold text-[#3E2723]">学習時間推移</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="px-4 py-4">
        {/* 合計時間 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
          <p className="text-gray-500 text-sm mb-1">
            {PERIOD_TABS.find((t) => t.key === selectedPeriod)?.label}の合計
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-gray-800">{mounted ? totalMinutes : 0}</span>
            <span className="text-xl text-gray-500">分</span>
          </div>
          {mounted && totalMinutes >= 60 && (
            <p className="text-sm text-gray-400 mt-1">({formatMinutesToDisplay(totalMinutes)})</p>
          )}
        </div>

        {/* 期間タブ */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {PERIOD_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedPeriod(tab.key)}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                selectedPeriod === tab.key
                  ? 'bg-[#FCC800] text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* グラフ */}
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <div className="h-64 relative">
            {mounted && chartData.length > 0 ? (
              <CssBarChart data={chartData} period={selectedPeriod} />
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-400">データがありません</p>
              </div>
            )}
          </div>

          {/* 凡例 */}
          <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#FCC800]" />
              <span className="text-xs text-gray-500">{legendLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-amber-200" />
              <span className="text-xs text-gray-500">過去</span>
            </div>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
