'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { getWeeklyChartData, ChartDataPoint, formatMinutesToDisplay } from '@/utils/learningTime';

export default function LearningTimeWidget() {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setChartData(getWeeklyChartData());
  }, []);

  // マウント前は静的なプレースホルダーを表示
  if (!mounted) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-700">学習時間</h2>
          <span className="text-gray-400">{'>'}</span>
        </div>
        <div className="h-28 flex items-center justify-center">
          <div className="w-full h-full bg-gray-50 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  // 今週の合計時間を計算
  const totalMinutes = chartData.reduce((sum, d) => sum + d.minutes, 0);

  // 最大値を取得（グリッド線用）
  const maxMinutes = Math.max(...chartData.map((d) => d.minutes), 10);

  // グリッド線の位置を計算（25%, 50%, 75%）
  const gridLines = [0.25, 0.5, 0.75].map((ratio) => Math.round(maxMinutes * ratio));

  // 今日のインデックス（最後の要素）
  const todayIndex = chartData.length - 1;

  return (
    <Link href="/study-log/time" className="block">
      <div className="bg-white rounded-2xl shadow-lg p-5 hover:shadow-xl transition-shadow">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-bold text-gray-700">学習時間</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              今週 {formatMinutesToDisplay(totalMinutes)}
            </span>
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </div>

        {/* グラフエリア */}
        <div className="h-28 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
              barCategoryGap="20%"
            >
              {/* グリッド線 */}
              {gridLines.map((value) => (
                <ReferenceLine
                  key={value}
                  y={value}
                  stroke="#e5e7eb"
                  strokeDasharray="3 3"
                />
              ))}

              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                dy={8}
              />

              <Bar
                dataKey="minutes"
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === todayIndex ? '#FCC800' : '#FDE68A'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Link>
  );
}
