import { getApiUrl } from './api';

let isWarmedUp = false;
let keepAliveInterval: ReturnType<typeof setInterval> | null = null;

/**
 * サーバーをウォームアップ（コールドスタート回避）
 * アプリ起動時に呼び出し、サーバーを事前に起こす
 */
export async function warmupServer(): Promise<void> {
  if (isWarmedUp) return;

  const url = getApiUrl('/api/health');
  try {
    await fetch(url, { method: 'GET' });
    isWarmedUp = true;
  } catch {
    // サーバーが起動中の場合は失敗するが、リクエスト自体がサーバーを起こすトリガーになる
  }
}

/**
 * 定期的にpingを送りサーバーのスリープを防止
 * Renderの無料/Starterプランは15分無通信でスリープする
 */
export function startKeepAlive(intervalMs: number = 10 * 60 * 1000): void {
  if (keepAliveInterval) return;

  const url = getApiUrl('/api/health');
  keepAliveInterval = setInterval(async () => {
    try {
      await fetch(url, { method: 'GET' });
    } catch {
      // ignore
    }
  }, intervalMs);
}

export function stopKeepAlive(): void {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}

/**
 * フォアグラウンド復帰時の再ウォームアップを設定
 * バックグラウンドから戻った際にサーバーがスリープしている場合に備える
 */
export function setupVisibilityWarmup(): () => void {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      // フォアグラウンドに戻った → 即座にウォームアップ
      isWarmedUp = false;
      warmupServer();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Capacitor: アプリがフォアグラウンドに復帰した時
  const handleResume = () => {
    isWarmedUp = false;
    warmupServer();
  };
  document.addEventListener('resume', handleResume);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    document.removeEventListener('resume', handleResume);
  };
}
