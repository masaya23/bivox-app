'use client';

import { useState, useEffect } from 'react';
import HardNavLink from '@/components/HardNavLink';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import MobileLayout from '@/components/MobileLayout';
import {
  getChartDataByPeriod,
  getTotalLearningTime,
  formatMinutesToDisplay,
  PeriodType,
  ChartDataPoint,
  generateDummyData,
} from '@/utils/learningTime';

// 期間タブの定義
const PERIOD_TABS: { key: PeriodType; label: string }[] = [
  { key: 'week', label: '1週間' },
  { key: 'month', label: '1ヶ月' },
  { key: '6months', label: '6ヶ月' },
  { key: 'year', label: '1年' },
  { key: 'all', label: '全て' },
];

// カスタムツールチップ
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: ChartDataPoint }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg text-sm">
        <p className="font-bold">{formatMinutesToDisplay(data.value)}</p>
        {data.payload.fullDate && (
          <p className="text-gray-300 text-xs">{data.payload.fullDate}</p>
        )}
      </div>
    );
  }
  return null;
}

export default function LearningTimePage() {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('week');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // データ読み込み
    const data = getChartDataByPeriod(selectedPeriod);
    setChartData(data);
    setTotalMinutes(getTotalLearningTime(selectedPeriod));
  }, [selectedPeriod]);

  // 期間変更時
  const handlePeriodChange = (period: PeriodType) => {
    setSelectedPeriod(period);
  };

  // デバッグ用：ダミーデータ生成
  const handleGenerateDummy = () => {
    generateDummyData();
    const data = getChartDataByPeriod(selectedPeriod);
    setChartData(data);
    setTotalMinutes(getTotalLearningTime(selectedPeriod));
  };

  // 最大値からY軸の上限を決定
  const maxValue = Math.max(...chartData.map((d) => d.minutes), 10);
  const yAxisMax = Math.ceil(maxValue / 10) * 10 + 10;

  // X軸のインターバル（データ数が多い場合は間引く）
  const getXAxisInterval = () => {
    if (chartData.length <= 7) return 0;
    if (chartData.length <= 15) return 1;
    if (chartData.length <= 30) return 4;
    return Math.floor(chartData.length / 6);
  };

  return (
    <MobileLayout showBottomNav={false} requireAuth={true}>
      {/* ヘッダー */}
      <div className="bg-white px-4 py-4 sticky top-0 z-10 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <HardNavLink
            href="/study-log"
            className="p-2 -ml-2 text-[#5D4037] hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </HardNavLink>
          <h1 className="text-lg font-bold text-[#3E2723]">学習時間推移</h1>
          <div className="w-10" /> {/* スペーサー */}
        </div>
      </div>

      <div className="px-4 py-4">
        {/* 合計時間表示 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
          <p className="text-gray-500 text-sm mb-1">
            {PERIOD_TABS.find((t) => t.key === selectedPeriod)?.label}の合計
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-gray-800">
              {mounted ? totalMinutes : 0}
            </span>
            <span className="text-xl text-gray-500">分</span>
          </div>
          {mounted && totalMinutes >= 60 && (
            <p className="text-sm text-gray-400 mt-1">
              ({formatMinutesToDisplay(totalMinutes)})
            </p>
          )}
        </div>

        {/* 期間切り替えタブ */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {PERIOD_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handlePeriodChange(tab.key)}
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
          <div className="h-64">
            {mounted && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 10, left: -10, bottom: 5 }}
                >
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    interval={getXAxisInterval()}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    domain={[0, yAxisMax]}
                    tickCount={5}
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: 'rgba(252, 200, 0, 0.1)' }}
                  />
                  <Bar dataKey="minutes" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {chartData.map((entry, index) => {
                      // 最後の要素（今日/今週/今月）をハイライト
                      const isLatest = index === chartData.length - 1;
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={isLatest ? '#FCC800' : '#FDE68A'}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
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
              <span className="text-xs text-gray-500">
                {selectedPeriod === 'week'
                  ? '今日'
                  : selectedPeriod === 'month'
                  ? '今日'
                  : selectedPeriod === '6months'
                  ? '今週'
                  : '今月'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-amber-200" />
              <span className="text-xs text-gray-500">過去</span>
            </div>
          </div>
        </div>

        {/* デバッグ用ボタン（本番では削除） */}
        {process.env.NODE_ENV === 'development' && (
          <button
            onClick={handleGenerateDummy}
            className="mt-4 w-full py-3 bg-gray-100 text-gray-600 rounded-xl text-sm hover:bg-gray-200 transition-colors"
          >
            ダミーデータを生成（テスト用）
          </button>
        )}
      </div>
    </MobileLayout>
  );
}
