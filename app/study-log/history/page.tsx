'use client';

import { useEffect, useMemo, useState } from 'react';
import { addDays, addMonths, endOfMonth, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, endOfWeek, subMonths } from 'date-fns';
import { ja } from 'date-fns/locale';
import MobileLayout, { PageHeader } from '@/components/MobileLayout';
import { getSessionLogDates, getSessionLogsByDate, SessionLogItem } from '@/utils/sessionLog';

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function StudyLogHistoryPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [studiedDateStrs, setStudiedDateStrs] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [sessions, setSessions] = useState<SessionLogItem[]>([]);
  const TODAY_OUTER_CIRCLE_SIZE = 36;
  const TODAY_WHITE_CIRCLE_SIZE = TODAY_OUTER_CIRCLE_SIZE - 4;
  const TODAY_INNER_CIRCLE_SIZE = TODAY_OUTER_CIRCLE_SIZE - 8;

  useEffect(() => {
    const dates = getSessionLogDates();
    setStudiedDateStrs(dates);
    if (dates.length > 0) {
      const sorted = [...dates].sort().reverse();
      const latest = sorted[0];
      const [y, m, d] = latest.split('-').map(Number);
      const initialDate = new Date(y, m - 1, d);
      setSelectedDate(initialDate);
      setCurrentMonth(initialDate);
      setSessions(getSessionLogsByDate(latest));
    }
  }, []);

  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const days: Date[] = [];
    let cursor = calendarStart;
    while (cursor <= calendarEnd) {
      days.push(cursor);
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
    }
    return days;
  }, [currentMonth]);

  const isStudied = (date: Date) => studiedDateStrs.includes(formatLocalDate(date));

  const handleSelectDate = (date: Date) => {
    const dateStr = formatLocalDate(date);
    setSelectedDate(date);
    setSessions(getSessionLogsByDate(dateStr));
  };

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  return (
    <MobileLayout showBottomNav={false} requireAuth={true}>
      <PageHeader
        title="学習履歴"
        backLink="/study-log"
        backLabel="戻る"
        gradient="bg-white border-b border-gray-100"
        titleClassName="text-[#3E2723]"
        backLinkClassName="text-[#5D4037] hover:text-[#3E2723]"
      />

      <div className="px-4 pt-4 pb-6">
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              ‹
            </button>
            <h2 className="font-bold text-gray-700">
              {format(currentMonth, 'yyyy年 M月', { locale: ja })}
            </h2>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {weekDays.map((day, i) => (
              <div
                key={day}
                className={`text-center text-xs font-bold py-1 ${
                  i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-500'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1 gap-x-0">
            {calendarDays.map((date, index) => {
              const inMonth = isSameMonth(date, currentMonth);
              const studied = inMonth && isStudied(date);
              const selected = selectedDate ? isSameDay(date, selectedDate) : false;
              const todayStr = formatLocalDate(new Date());
              const dateStr = formatLocalDate(date);
              const isTodayDate = dateStr === todayStr;
              const showLeftBand = studied && isStudied(addDays(date, -1));
              const showRightBand = studied && isStudied(addDays(date, 1));
              const showTodayDoubleCircle = studied && isTodayDate;

              return (
                <button
                  key={index}
                  onClick={() => studied && handleSelectDate(date)}
                  disabled={!studied}
                  className="flex items-center justify-center h-10"
                >
                  <div className="relative flex items-center justify-center w-full h-full overflow-hidden">
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
                        className={`relative z-10 w-9 h-9 flex items-center justify-center text-sm rounded-full ${
                          !inMonth ? 'text-gray-300' : 'text-gray-700'
                        } ${
                          studied ? 'bg-orange-500 text-white font-bold' : ''
                        } ${
                          selected && !isTodayDate ? 'ring-2 ring-teal-300' : ''
                        }`}
                      >
                        {format(date, 'd')}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-700">
              {selectedDate ? format(selectedDate, 'M月d日', { locale: ja }) : '学習履歴'}
            </h3>
            <span className="text-xs text-gray-400">
              {sessions.length > 0 ? `${sessions.length}件` : ''}
            </span>
          </div>

          {sessions.length === 0 ? (
            <p className="text-center text-gray-400 py-8">学習記録がありません</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((session, index) => (
                <div
                  key={`${session.date}-${index}`}
                  className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-3 py-3"
                >
                  <span className="text-sm font-semibold text-gray-700">{session.mode}</span>
                  <span className="text-sm text-gray-500">{session.questions}問</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
