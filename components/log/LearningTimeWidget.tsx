'use client';

import { useState, useEffect } from 'react';
import HardNavLink from '@/components/HardNavLink';
import { getWeeklyChartData, ChartDataPoint, formatMinutesToDisplay } from '@/utils/learningTime';

function CssBarChart({ data, height = 96 }: { data: ChartDataPoint[]; height?: number }) {
  const [animated, setAnimated] = useState(false);
  const maxMinutes = Math.max(...data.map((d) => d.minutes), 1);
  const todayIndex = data.length - 1;

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 50);
    return () => clearTimeout(t);
  }, [data]);

  return (
    <div className="flex items-end justify-around w-full" style={{ height }}>
      {data.map((d, i) => {
        const pct = Math.max((d.minutes / maxMinutes) * 85, d.minutes > 0 ? 4 : 0);
        const isToday = i === todayIndex;
        return (
          <div key={i} className="flex flex-col items-center flex-1 h-full justify-end gap-1">
            <div
              style={{
                height: animated ? `${pct}%` : '0%',
                backgroundColor: isToday ? '#FCC800' : '#FDE68A',
                maxWidth: 24,
                width: '100%',
                borderRadius: '2px 2px 0 0',
                transition: `height 0.5s ease ${i * 50}ms`,
              }}
            />
            <span className="text-[10px] text-gray-400">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function LearningTimeWidget() {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setChartData(getWeeklyChartData());
  }, []);

  if (!mounted) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-700">学習時間</h2>
          <span className="text-gray-400">{'>'}</span>
        </div>
        <div className="h-28 bg-gray-50 rounded animate-pulse" />
      </div>
    );
  }

  const totalMinutes = chartData.reduce((sum, d) => sum + d.minutes, 0);

  return (
    <HardNavLink href="/study-log/time" className="block">
      <div className="bg-white rounded-2xl shadow-lg p-5 hover:shadow-xl transition-shadow">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-bold text-gray-700">学習時間</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              今週 {formatMinutesToDisplay(totalMinutes)}
            </span>
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
        <div className="h-28 mt-2 px-1">
          <CssBarChart data={chartData} height={96} />
        </div>
      </div>
    </HardNavLink>
  );
}
