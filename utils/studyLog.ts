// 学習記録をLocalStorageに保存・取得するユーティリティ

const STUDY_LOG_KEY = 'study_completed_dates';

// ローカルタイムゾーンでYYYY-MM-DD形式の文字列を生成
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// YYYY-MM-DD文字列をローカルタイムゾーンのDateに変換
const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date;
};

// 学習完了日を取得（Date配列）
export const getStudiedDates = (): Date[] => {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STUDY_LOG_KEY);
    if (!stored) return [];

    const dateStrings: string[] = JSON.parse(stored);
    return dateStrings.map(str => parseLocalDate(str));
  } catch {
    return [];
  }
};

// 今日の学習を完了として記録
export const recordStudyCompletion = (): void => {
  if (typeof window === 'undefined') return;

  try {
    const today = new Date();
    const todayStr = formatLocalDate(today);

    const stored = localStorage.getItem(STUDY_LOG_KEY);
    const dateStrings: string[] = stored ? JSON.parse(stored) : [];

    // 既に今日の記録がある場合は追加しない
    if (!dateStrings.includes(todayStr)) {
      dateStrings.push(todayStr);
      localStorage.setItem(STUDY_LOG_KEY, JSON.stringify(dateStrings));
    }
  } catch (e) {
    console.error('Failed to record study completion:', e);
  }
};

// 今日学習済みかどうかをチェック
export const hasStudiedToday = (): boolean => {
  if (typeof window === 'undefined') return false;

  try {
    const todayStr = formatLocalDate(new Date());

    const stored = localStorage.getItem(STUDY_LOG_KEY);
    if (!stored) return false;

    const dateStrings: string[] = JSON.parse(stored);
    return dateStrings.includes(todayStr);
  } catch {
    return false;
  }
};

// 現在のストリーク（連続日数）を計算
export const calculateStreak = (): number => {
  const dates = getStudiedDates();
  if (dates.length === 0) return 0;

  // 日付を降順にソート（最新が先頭）
  dates.sort((a, b) => b.getTime() - a.getTime());

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let streak = 0;
  let checkDate = new Date(today);

  // 今日学習していない場合、昨日からカウント開始
  const latestStudyDate = dates[0];
  if (latestStudyDate.getTime() !== today.getTime()) {
    // 昨日も学習していなければストリークは0
    if (latestStudyDate.getTime() !== yesterday.getTime()) {
      return 0;
    }
    checkDate = new Date(yesterday);
  }

  // 連続日数をカウント
  for (const date of dates) {
    if (date.getTime() === checkDate.getTime()) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (date.getTime() < checkDate.getTime()) {
      // 日付が飛んでいる場合はストリーク終了
      break;
    }
  }

  return streak;
};
