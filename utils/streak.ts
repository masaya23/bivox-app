/**
 * Streak（連続学習日数）管理のユーティリティ
 */

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastTrainingDate: string | null;
  totalDays: number;
}

/**
 * 2つの日付が同じ日かチェック
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * 2つの日付が連続した日かチェック
 */
function isConsecutiveDay(date1: Date, date2: Date): boolean {
  const diff = Math.abs(date1.getTime() - date2.getTime());
  const dayInMs = 24 * 60 * 60 * 1000;
  return diff < dayInMs * 1.5; // 36時間以内なら連続とみなす
}

/**
 * Streakデータを取得
 */
export function getStreakData(): StreakData {
  const defaultData: StreakData = {
    currentStreak: 0,
    longestStreak: 0,
    lastTrainingDate: null,
    totalDays: 0,
  };

  try {
    const stored = localStorage.getItem('streakData');
    if (!stored) return defaultData;

    return JSON.parse(stored);
  } catch {
    return defaultData;
  }
}

/**
 * トレーニング完了時にStreakを更新
 */
export function updateStreak(): StreakData {
  const today = new Date();
  const streakData = getStreakData();

  if (!streakData.lastTrainingDate) {
    // 初回トレーニング
    const newData: StreakData = {
      currentStreak: 1,
      longestStreak: 1,
      lastTrainingDate: today.toISOString(),
      totalDays: 1,
    };
    localStorage.setItem('streakData', JSON.stringify(newData));
    return newData;
  }

  const lastDate = new Date(streakData.lastTrainingDate);

  if (isSameDay(today, lastDate)) {
    // 同じ日の場合は更新しない
    return streakData;
  }

  if (isConsecutiveDay(lastDate, today)) {
    // 連続日の場合
    const newStreak = streakData.currentStreak + 1;
    const newData: StreakData = {
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, streakData.longestStreak),
      lastTrainingDate: today.toISOString(),
      totalDays: streakData.totalDays + 1,
    };
    localStorage.setItem('streakData', JSON.stringify(newData));
    return newData;
  }

  // Streakが途切れた場合
  const newData: StreakData = {
    currentStreak: 1,
    longestStreak: streakData.longestStreak,
    lastTrainingDate: today.toISOString(),
    totalDays: streakData.totalDays + 1,
  };
  localStorage.setItem('streakData', JSON.stringify(newData));
  return newData;
}
