/**
 * 学習時間の記録・取得ユーティリティ
 */

import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  format,
  subDays,
  subMonths,
  subYears,
  isWithinInterval,
  parseISO,
} from 'date-fns';
import { ja } from 'date-fns/locale';

const LEARNING_TIME_KEY = 'learning_time_records';

// 学習時間レコードの型
export interface LearningTimeRecord {
  date: string; // YYYY-MM-DD形式
  minutes: number;
}

// グラフ用データの型
export interface ChartDataPoint {
  label: string;
  minutes: number;
  fullDate?: string;
}

// 期間タイプ
export type PeriodType = 'week' | 'month' | '6months' | 'year' | 'all';

// ローカルタイムゾーンでYYYY-MM-DD形式の文字列を生成
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 学習時間を記録
 * @param minutes 学習時間（分）
 */
export function recordLearningTime(minutes: number): void {
  if (typeof window === 'undefined') return;

  try {
    const todayStr = formatLocalDate(new Date());
    const stored = localStorage.getItem(LEARNING_TIME_KEY);
    const records: LearningTimeRecord[] = stored ? JSON.parse(stored) : [];

    // 今日のレコードを探す
    const existingIndex = records.findIndex((r) => r.date === todayStr);
    if (existingIndex >= 0) {
      // 既存のレコードに加算
      records[existingIndex].minutes += minutes;
    } else {
      // 新しいレコードを追加
      records.push({ date: todayStr, minutes });
    }

    localStorage.setItem(LEARNING_TIME_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to record learning time:', e);
  }
}

/**
 * すべての学習時間レコードを取得
 */
export function getAllLearningTimeRecords(): LearningTimeRecord[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(LEARNING_TIME_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * 今日の学習時間を取得
 */
export function getTodayLearningTime(): number {
  const records = getAllLearningTimeRecords();
  const todayStr = formatLocalDate(new Date());
  const todayRecord = records.find((r) => r.date === todayStr);
  return todayRecord?.minutes || 0;
}

/**
 * 期間の合計学習時間を取得
 */
export function getTotalLearningTime(period: PeriodType): number {
  const records = getAllLearningTimeRecords();
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case 'week':
      startDate = subDays(now, 6);
      break;
    case 'month':
      startDate = subDays(now, 29);
      break;
    case '6months':
      startDate = subMonths(now, 6);
      break;
    case 'year':
      startDate = subYears(now, 1);
      break;
    case 'all':
    default:
      return records.reduce((sum, r) => sum + r.minutes, 0);
  }

  startDate.setHours(0, 0, 0, 0);

  return records
    .filter((r) => {
      const recordDate = parseISO(r.date);
      return recordDate >= startDate && recordDate <= now;
    })
    .reduce((sum, r) => sum + r.minutes, 0);
}

/**
 * 直近7日間のデータを取得（ウィジェット用）
 */
export function getWeeklyChartData(): ChartDataPoint[] {
  const records = getAllLearningTimeRecords();
  const now = new Date();
  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
  const result: ChartDataPoint[] = [];

  // 直近7日間
  for (let i = 6; i >= 0; i--) {
    const date = subDays(now, i);
    const dateStr = formatLocalDate(date);
    const record = records.find((r) => r.date === dateStr);
    const dayOfWeek = date.getDay();

    result.push({
      label: weekDays[dayOfWeek],
      minutes: record?.minutes || 0,
      fullDate: dateStr,
    });
  }

  return result;
}

/**
 * 期間に応じたグラフデータを取得（詳細ページ用）
 */
export function getChartDataByPeriod(period: PeriodType): ChartDataPoint[] {
  const records = getAllLearningTimeRecords();
  const now = new Date();

  switch (period) {
    case 'week':
      return getWeeklyChartData();

    case 'month': {
      // 直近30日間（日ごと）
      const result: ChartDataPoint[] = [];
      for (let i = 29; i >= 0; i--) {
        const date = subDays(now, i);
        const dateStr = formatLocalDate(date);
        const record = records.find((r) => r.date === dateStr);
        result.push({
          label: format(date, 'd', { locale: ja }),
          minutes: record?.minutes || 0,
          fullDate: dateStr,
        });
      }
      return result;
    }

    case '6months': {
      // 直近6ヶ月（週ごとに集計）
      const startDate = subMonths(now, 6);
      const weeks = eachWeekOfInterval(
        { start: startDate, end: now },
        { weekStartsOn: 1 }
      );

      return weeks.map((weekStart) => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const weekMinutes = records
          .filter((r) => {
            const recordDate = parseISO(r.date);
            return isWithinInterval(recordDate, { start: weekStart, end: weekEnd });
          })
          .reduce((sum, r) => sum + r.minutes, 0);

        return {
          label: format(weekStart, 'M/d', { locale: ja }),
          minutes: weekMinutes,
          fullDate: formatLocalDate(weekStart),
        };
      });
    }

    case 'year': {
      // 直近12ヶ月（月ごとに集計）
      const startDate = subYears(now, 1);
      const months = eachMonthOfInterval({ start: startDate, end: now });

      return months.map((monthStart) => {
        const monthEnd = endOfMonth(monthStart);
        const monthMinutes = records
          .filter((r) => {
            const recordDate = parseISO(r.date);
            return isWithinInterval(recordDate, { start: monthStart, end: monthEnd });
          })
          .reduce((sum, r) => sum + r.minutes, 0);

        return {
          label: format(monthStart, 'M月', { locale: ja }),
          minutes: monthMinutes,
          fullDate: formatLocalDate(monthStart),
        };
      });
    }

    case 'all':
    default: {
      // 全期間（月ごとに集計）
      if (records.length === 0) return [];

      // 最初のレコードの日付を取得
      const sortedRecords = [...records].sort((a, b) => a.date.localeCompare(b.date));
      const firstDate = parseISO(sortedRecords[0].date);
      const months = eachMonthOfInterval({ start: firstDate, end: now });

      return months.map((monthStart) => {
        const monthEnd = endOfMonth(monthStart);
        const monthMinutes = records
          .filter((r) => {
            const recordDate = parseISO(r.date);
            return isWithinInterval(recordDate, { start: monthStart, end: monthEnd });
          })
          .reduce((sum, r) => sum + r.minutes, 0);

        return {
          label: format(monthStart, 'yy/M', { locale: ja }),
          minutes: monthMinutes,
          fullDate: formatLocalDate(monthStart),
        };
      });
    }
  }
}

/**
 * ダミーデータを生成（テスト用）
 */
export function generateDummyData(): void {
  if (typeof window === 'undefined') return;

  const records: LearningTimeRecord[] = [];
  const now = new Date();

  // 過去90日分のダミーデータを生成
  for (let i = 90; i >= 0; i--) {
    const date = subDays(now, i);
    const dateStr = formatLocalDate(date);

    // 70%の確率で学習記録を追加
    if (Math.random() < 0.7) {
      // 5〜45分のランダムな学習時間
      const minutes = Math.floor(Math.random() * 40) + 5;
      records.push({ date: dateStr, minutes });
    }
  }

  localStorage.setItem(LEARNING_TIME_KEY, JSON.stringify(records));
}

/**
 * 分を「○時間○分」形式にフォーマット
 */
export function formatMinutesToDisplay(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}分`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}時間`;
  }
  return `${hours}時間${mins}分`;
}
