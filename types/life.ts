// ライフ（スタミナ）システムの型定義

// ライフ設定定数
export const LIFE_CONFIG = {
  // 最大ライフ
  MAX_LIFE: 50,
  // 1ライフ回復にかかる時間（分）
  RECOVERY_INTERVAL_MINUTES: 28,
  // 1問あたりの消費ライフ
  LIFE_PER_QUESTION: 1,
} as const;

// ライフ状態
export interface LifeState {
  // 現在のライフ（整数）
  currentLife: number;
  // 最後にライフが更新された時刻（ISO文字列）
  lastUpdateAt: string;
  // 次の回復までの残り時間（秒）- UIのカウントダウン用
  secondsToNextRecovery: number;
  // 回復中かどうか（満タンではない）
  isRecovering: boolean;
}

// ライフ消費結果
export interface LifeConsumeResult {
  success: boolean;
  remainingLife: number;
  message?: string;
}

// 経過時間からライフ回復量を計算
export function calculateRecoveredLife(
  currentLife: number,
  lastUpdateAt: Date,
  now: Date = new Date()
): { newLife: number; newUpdateAt: Date; secondsToNext: number } {
  const elapsedMs = now.getTime() - lastUpdateAt.getTime();
  const elapsedMinutes = elapsedMs / (1000 * 60);

  // 回復量を計算（28分ごとに1ライフ）
  const recoveredLife = Math.floor(elapsedMinutes / LIFE_CONFIG.RECOVERY_INTERVAL_MINUTES);

  // 新しいライフ（最大値を超えない）
  const newLife = Math.min(currentLife + recoveredLife, LIFE_CONFIG.MAX_LIFE);

  // 余りの時間を計算して、次回の更新時刻を決定
  const usedMinutes = recoveredLife * LIFE_CONFIG.RECOVERY_INTERVAL_MINUTES;
  const remainingMinutes = elapsedMinutes - usedMinutes;

  // 更新時刻を調整（余りを保持するため）
  const newUpdateAt = new Date(lastUpdateAt.getTime() + usedMinutes * 60 * 1000);

  // 次の回復までの残り時間（秒）
  const minutesToNext = LIFE_CONFIG.RECOVERY_INTERVAL_MINUTES - remainingMinutes;
  const secondsToNext = newLife >= LIFE_CONFIG.MAX_LIFE ? 0 : Math.ceil(minutesToNext * 60);

  return { newLife, newUpdateAt, secondsToNext };
}

// ライフ消費可能かチェック
export function canConsumeLife(currentLife: number): boolean {
  return currentLife >= LIFE_CONFIG.LIFE_PER_QUESTION;
}

// フル回復までの残り時間（秒）を計算
export function getTimeToFullRecovery(
  currentLife: number,
  secondsToNextRecovery: number
): number {
  if (currentLife >= LIFE_CONFIG.MAX_LIFE) return 0;

  const livesToRecover = LIFE_CONFIG.MAX_LIFE - currentLife;
  // 最初の1回復までの時間 + 残りの回復に必要な時間
  return secondsToNextRecovery + (livesToRecover - 1) * LIFE_CONFIG.RECOVERY_INTERVAL_MINUTES * 60;
}

// 時間フォーマット（MM:SS or HH:MM:SS）
export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return '00:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
