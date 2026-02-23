/**
 * Streak（連続学習日数）管理のユーティリティ
 */

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastTrainingDate: string | null;
  totalDays: number;
  history: string[]; // 学習日のリスト（YYYY-MM-DD形式）
  todayQuestions: number; // 本日の問題数
  todaySessions: number; // 本日のセッション数
  totalQuestions: number; // 合計問題数
  totalSessions: number; // 合計セッション数
}

// ローカルタイムゾーンでYYYY-MM-DD形式の文字列を生成
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 2つの日付文字列が同じ日かチェック
 */
function isSameDayStr(dateStr1: string, dateStr2: string): boolean {
  return dateStr1 === dateStr2;
}

/**
 * 2つの日付文字列が連続した日かチェック
 */
function isConsecutiveDayStr(dateStr1: string, dateStr2: string): boolean {
  const [y1, m1, d1] = dateStr1.split('-').map(Number);
  const [y2, m2, d2] = dateStr2.split('-').map(Number);
  const date1 = new Date(y1, m1 - 1, d1);
  const date2 = new Date(y2, m2 - 1, d2);
  const diff = Math.abs(date1.getTime() - date2.getTime());
  const dayInMs = 24 * 60 * 60 * 1000;
  return diff >= dayInMs * 0.5 && diff < dayInMs * 1.5;
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
    history: [],
    todayQuestions: 0,
    todaySessions: 0,
    totalQuestions: 0,
    totalSessions: 0,
  };

  if (typeof window === 'undefined') return defaultData;

  try {
    const stored = localStorage.getItem('streakData');
    if (!stored) return defaultData;

    const data = JSON.parse(stored) as StreakData;

    // 本日の日付を取得
    const todayStr = formatLocalDate(new Date());

    // lastTrainingDateが今日でない場合、todayQuestions/todaySessionsをリセット
    if (data.lastTrainingDate !== todayStr) {
      data.todayQuestions = 0;
      data.todaySessions = 0;
    }

    // historyが無い場合は初期化
    if (!data.history) {
      data.history = data.lastTrainingDate ? [data.lastTrainingDate] : [];
    }

    return data;
  } catch {
    return defaultData;
  }
}

/**
 * トレーニング完了時にStreakを更新
 * @param questionsCount 完了した問題数
 */
export function updateStreak(questionsCount: number = 10): StreakData {
  const todayStr = formatLocalDate(new Date());
  const streakData = getStreakData();

  if (!streakData.lastTrainingDate) {
    // 初回トレーニング
    const newData: StreakData = {
      currentStreak: 1,
      longestStreak: 1,
      lastTrainingDate: todayStr,
      totalDays: 1,
      history: [todayStr],
      todayQuestions: questionsCount,
      todaySessions: 1,
      totalQuestions: questionsCount,
      totalSessions: 1,
    };
    localStorage.setItem('streakData', JSON.stringify(newData));
    return newData;
  }

  const lastDateStr = streakData.lastTrainingDate;

  if (isSameDayStr(todayStr, lastDateStr)) {
    // 同じ日の場合はセッションと問題数のみ更新
    const newData: StreakData = {
      ...streakData,
      todayQuestions: streakData.todayQuestions + questionsCount,
      todaySessions: streakData.todaySessions + 1,
      totalQuestions: streakData.totalQuestions + questionsCount,
      totalSessions: streakData.totalSessions + 1,
    };
    localStorage.setItem('streakData', JSON.stringify(newData));
    return newData;
  }

  // 新しい日の学習
  const history = streakData.history || [];
  if (!history.includes(todayStr)) {
    history.push(todayStr);
  }

  if (isConsecutiveDayStr(lastDateStr, todayStr)) {
    // 連続日の場合
    const newStreak = streakData.currentStreak + 1;
    const newData: StreakData = {
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, streakData.longestStreak),
      lastTrainingDate: todayStr,
      totalDays: history.length,
      history,
      todayQuestions: questionsCount,
      todaySessions: 1,
      totalQuestions: streakData.totalQuestions + questionsCount,
      totalSessions: streakData.totalSessions + 1,
    };
    localStorage.setItem('streakData', JSON.stringify(newData));
    return newData;
  }

  // Streakが途切れた場合
  const newData: StreakData = {
    currentStreak: 1,
    longestStreak: streakData.longestStreak,
    lastTrainingDate: todayStr,
    totalDays: history.length,
    history,
    todayQuestions: questionsCount,
    todaySessions: 1,
    totalQuestions: streakData.totalQuestions + questionsCount,
    totalSessions: streakData.totalSessions + 1,
  };
  localStorage.setItem('streakData', JSON.stringify(newData));
  return newData;
}

/**
 * 学習履歴をDate配列で取得
 */
export function getStudiedDates(): Date[] {
  const data = getStreakData();
  return (data.history || []).map(dateStr => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  });
}
