/**
 * セッションログ（本日の学習表示用）
 */

export interface SessionLogItem {
  date: string; // YYYY-MM-DD
  mode: string;
  questions: number;
  // v2 追加フィールド（旧データにはないので optional）
  grade?: string;     // "中学1年", "中学2年", "中学3年", "全学年"
  partLabel?: string; // "Part1", "まとめ" など
  unit?: 'minutes' | 'questions'; // "questions" がデフォルト
}

const SESSION_LOG_KEY = 'session_log_items';

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// gradeId → 表示ラベル
const GRADE_LABELS: Record<string, string> = {
  'junior-high-1': '中学1年',
  'junior-high-2': '中学2年',
  'junior-high-3': '中学3年',
  'all': '全学年',
};

export function recordSession(
  mode: string,
  questions: number,
  options?: { gradeId?: string; partLabel?: string; unit?: 'minutes' | 'questions' },
): void {
  if (typeof window === 'undefined') return;

  try {
    const todayStr = formatLocalDate(new Date());
    const grade = options?.gradeId ? (GRADE_LABELS[options.gradeId] || options.gradeId) : undefined;

    const stored = localStorage.getItem(SESSION_LOG_KEY);
    const records: SessionLogItem[] = stored ? JSON.parse(stored) : [];
    records.push({
      date: todayStr,
      mode,
      questions,
      grade,
      partLabel: options?.partLabel,
      unit: options?.unit,
    });
    localStorage.setItem(SESSION_LOG_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to record session log:', e);
  }
}

export function getTodaySessionLogs(): SessionLogItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(SESSION_LOG_KEY);
    if (!stored) return [];
    const records: SessionLogItem[] = JSON.parse(stored);
    const todayStr = formatLocalDate(new Date());
    return records.filter((r) => r.date === todayStr);
  } catch {
    return [];
  }
}

export function getAllSessionLogs(): SessionLogItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(SESSION_LOG_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function getSessionLogsByDate(dateStr: string): SessionLogItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(SESSION_LOG_KEY);
    if (!stored) return [];
    const records: SessionLogItem[] = JSON.parse(stored);
    return records.filter((r) => r.date === dateStr);
  } catch {
    return [];
  }
}

export function getSessionLogDates(): string[] {
  const logs = getAllSessionLogs();
  const unique = new Set<string>();
  logs.forEach((log) => unique.add(log.date));
  return Array.from(unique);
}
