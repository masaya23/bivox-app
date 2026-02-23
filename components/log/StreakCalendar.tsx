'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  addDays,
  addMonths,
  subMonths,
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { getStudiedDates, getStreakData } from '@/utils/streak';

// ========== 型定義 ==========
interface StreakCalendarProps {
  studiedDates?: Date[];
}

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ========== メインコンポーネント ==========
export default function StreakCalendar({
  studiedDates: propStudiedDates,
}: StreakCalendarProps) {
  // LocalStorageから学習記録を取得
  const [studiedDates, setStudiedDates] = useState<Date[]>([]);
  const [displayStreak, setDisplayStreak] = useState<number>(0);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    // propsで渡された場合はそれを使用、なければLocalStorageから取得
    if (propStudiedDates && propStudiedDates.length > 0) {
      setStudiedDates(propStudiedDates);
    } else {
      setStudiedDates(getStudiedDates());
    }
    // ストリーク数を計算
    setDisplayStreak(getStreakData().currentStreak);
  }, [propStudiedDates]);

  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  // カレンダーの日付を生成
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  const studiedDateSet = useMemo(() => {
    const set = new Set<string>();
    studiedDates.forEach((date) => set.add(formatLocalDate(date)));
    return set;
  }, [studiedDates]);

  // 日付が学習済みかどうかをチェック
  const isStudied = (date: Date): boolean => studiedDateSet.has(formatLocalDate(date));

  // 前月へ
  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  // 次月へ
  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // セルのサイズ定数
  const CELL_HEIGHT = 40; // h-10 = 40px
  const TODAY_OUTER_CIRCLE_SIZE = 36;
  const TODAY_WHITE_CIRCLE_SIZE = TODAY_OUTER_CIRCLE_SIZE - 4;
  const TODAY_INNER_CIRCLE_SIZE = TODAY_OUTER_CIRCLE_SIZE - 8;

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* ストリーク表示ヘッダー */}
      <div className="bg-gradient-to-r from-orange-400 to-amber-400 px-5 py-4">
        <div className="flex items-center justify-center gap-3">
          <span className="text-4xl">🔥</span>
          <div className="text-white">
            <span className="text-4xl font-black">{displayStreak}</span>
            <span className="text-lg font-bold ml-1">日連続</span>
          </div>
        </div>
        <p className="text-center text-white/80 text-sm mt-1">
          今日も学習してストリークを継続しよう！
        </p>
      </div>

      {/* カレンダー本体 */}
      <div className="p-5">
        {/* 月ナビゲーション */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="font-bold text-gray-700 text-lg">
            {format(currentMonth, 'yyyy年 M月', { locale: ja })}
          </h2>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 mb-2">
          {weekDays.map((day, i) => (
            <div
              key={day}
              className={`text-center text-sm font-bold py-2 ${
                i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-500'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* カレンダーグリッド */}
        <div className="relative grid grid-cols-7 gap-y-1 gap-x-0">
            {calendarDays.map((date, index) => {
              const isCurrentMonth = isSameMonth(date, currentMonth);
              const isTodayDate = isToday(date);
              const studied = isStudied(date) && isCurrentMonth;
              const showLeftBand = studied && isStudied(addDays(date, -1));
              const showRightBand = studied && isStudied(addDays(date, 1));
              const showTodayDoubleCircle = studied && isTodayDate;

              return (
                <div
                  key={index}
                  className="relative flex items-center justify-center overflow-hidden"
                  style={{ height: `${CELL_HEIGHT}px` }}
                >
                  {showLeftBand && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[30px] w-1/2 bg-orange-300" />
                  )}
                  {showRightBand && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 h-[30px] w-1/2 bg-orange-300" />
                  )}

                  {showTodayDoubleCircle ? (
                    <div
                      className="relative z-10 flex items-center justify-center"
                      style={{ width: `${TODAY_OUTER_CIRCLE_SIZE}px`, height: `${TODAY_OUTER_CIRCLE_SIZE}px` }}
                    >
                      <span
                        className="absolute rounded-full bg-orange-500"
                        style={{ width: `${TODAY_OUTER_CIRCLE_SIZE}px`, height: `${TODAY_OUTER_CIRCLE_SIZE}px` }}
                      />
                      <span
                        className="absolute rounded-full bg-white"
                        style={{ width: `${TODAY_WHITE_CIRCLE_SIZE}px`, height: `${TODAY_WHITE_CIRCLE_SIZE}px` }}
                      />
                      <span
                        className="absolute rounded-full bg-orange-500"
                        style={{ width: `${TODAY_INNER_CIRCLE_SIZE}px`, height: `${TODAY_INNER_CIRCLE_SIZE}px` }}
                      />
                      <span className="relative text-sm font-bold text-white">{format(date, 'd')}</span>
                    </div>
                  ) : (
                    <div
                      className={`
                        relative z-10 w-9 h-9 flex items-center justify-center text-sm rounded-full
                        ${!isCurrentMonth ? 'text-gray-300' : ''}
                        ${studied ? 'bg-orange-500 text-white font-bold' : 'text-gray-700'}
                        ${isTodayDate && !studied ? 'ring-2 ring-orange-400 font-bold text-orange-500' : ''}
                      `}
                    >
                      {format(date, 'd')}
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* 凡例 */}
        <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gradient-to-b from-orange-300 to-orange-600" />
            <span className="text-xs text-gray-500">学習した日</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full ring-2 ring-orange-400" />
            <span className="text-xs text-gray-500">今日</span>
          </div>
        </div>
      </div>
    </div>
  );
}
