/**
 * シンプルなレートリミット（メモリベース）
 * 本番環境ではRedisなどの永続化ストアを使用することを推奨
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

export interface RateLimitConfig {
  /**
   * 時間ウィンドウ（ミリ秒）
   */
  windowMs: number;
  /**
   * ウィンドウ内での最大リクエスト数
   */
  max: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
}

/**
 * レートリミットをチェック
 * @param identifier ユーザーまたはセッションの識別子（IPアドレスなど）
 * @param config レートリミット設定
 * @returns レートリミット結果
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const record = store[identifier];

  // 既存のレコードがない、または期限切れの場合
  if (!record || now > record.resetTime) {
    store[identifier] = {
      count: 1,
      resetTime: now + config.windowMs,
    };

    return {
      success: true,
      limit: config.max,
      remaining: config.max - 1,
      resetTime: now + config.windowMs,
    };
  }

  // リミットを超えている場合
  if (record.count >= config.max) {
    return {
      success: false,
      limit: config.max,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  // カウントを増やす
  record.count += 1;

  return {
    success: true,
    limit: config.max,
    remaining: config.max - record.count,
    resetTime: record.resetTime,
  };
}

/**
 * 古いレコードをクリーンアップ（メモリリーク防止）
 */
export function cleanupOldRecords(): void {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}

// 定期的にクリーンアップ（5分ごと）
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupOldRecords, 5 * 60 * 1000);
}

/**
 * 一般的なレートリミット設定
 */
export const RATE_LIMITS = {
  // TTS: 1分あたり30回
  TTS: {
    windowMs: 60 * 1000,
    max: 30,
  },
  // AI質問: 1分あたり10回
  ASK_AI: {
    windowMs: 60 * 1000,
    max: 10,
  },
  // 例文生成: 1時間あたり20回
  GENERATE_SENTENCES: {
    windowMs: 60 * 60 * 1000,
    max: 20,
  },
} as const;
