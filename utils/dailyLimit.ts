/**
 * プラン別の日次API呼び出し上限（メモリベース）
 * 毎日0時（JST）にリセット
 * サーバー再起動でもリセットされるが、制限が緩む方向なので安全
 */

export type UserPlan = 'free' | 'plus' | 'pro' | 'master';

interface DailyRecord {
  count: number;
  /** JST日付文字列 (例: "2026-02-27") */
  date: string;
}

/** ユーザーID × エンドポイント → 日次カウント */
const store: Record<string, DailyRecord> = {};

export interface DailyLimitConfig {
  /** エンドポイント名（ストアのキーに使用） */
  endpoint: string;
  /** プラン別の日次上限。0 = 使用不可、-1 = 無制限。masterは早期リターンで処理 */
  limits: Record<Exclude<UserPlan, 'master'>, number>;
}

export interface DailyLimitResult {
  success: boolean;
  /** 当日の使用回数 */
  used: number;
  /** プランの日次上限 */
  limit: number;
  /** 残り回数 (-1 = 無制限) */
  remaining: number;
  /** リセット時刻（次の0時 JST）のUNIXミリ秒 */
  resetTime: number;
}

interface DailyLimitEvaluation {
  resetTime: number;
  limit: number;
  today: string;
  key: string;
  record: DailyRecord | undefined;
}

/** 現在のJST日付文字列を返す */
function getJSTDateString(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

/** 次の0時（JST）のUNIXミリ秒を返す */
function getNextMidnightJST(): number {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const tomorrow = new Date(jst);
  tomorrow.setUTCHours(0, 0, 0, 0);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  // JSTの0時 = UTC 15:00前日
  return tomorrow.getTime() - 9 * 60 * 60 * 1000;
}

/**
 * 日次上限をチェックし、成功時はカウントを増やす
 */
function evaluateDailyLimit(
  clientId: string,
  plan: UserPlan,
  config: DailyLimitConfig
): DailyLimitEvaluation {
  const resetTime = getNextMidnightJST();
  const limit = plan === 'master' ? -1 : config.limits[plan];
  const today = getJSTDateString();
  const key = `${clientId}:${config.endpoint}`;
  const record = store[key];

  return {
    resetTime,
    limit,
    today,
    key,
    record,
  };
}

export function previewDailyLimit(
  clientId: string,
  plan: UserPlan,
  config: DailyLimitConfig
): DailyLimitResult {
  const resetTime = getNextMidnightJST();

  // マスターアカウントは常に無制限
  if (plan === 'master') {
    return {
      success: true,
      used: 0,
      limit: -1,
      remaining: -1,
      resetTime,
    };
  }

  const { limit, record, today } = evaluateDailyLimit(clientId, plan, config);

  // 使用不可（0）
  if (limit === 0) {
    return {
      success: false,
      used: 0,
      limit: 0,
      remaining: 0,
      resetTime,
    };
  }

  // 無制限（-1）
  if (limit === -1) {
    return {
      success: true,
      used: 0,
      limit: -1,
      remaining: -1,
      resetTime,
    };
  }

  if (!record || record.date !== today) {
    return {
      success: true,
      used: 0,
      limit,
      remaining: limit,
      resetTime,
    };
  }

  if (record.count >= limit) {
    return {
      success: false,
      used: record.count,
      limit,
      remaining: 0,
      resetTime,
    };
  }

  return {
    success: true,
    used: record.count,
    limit,
    remaining: limit - record.count,
    resetTime,
  };
}

export function consumeDailyLimit(
  clientId: string,
  plan: UserPlan,
  config: DailyLimitConfig
): DailyLimitResult {
  const resetTime = getNextMidnightJST();

  // マスターアカウントは常に無制限
  if (plan === 'master') {
    return {
      success: true,
      used: 0,
      limit: -1,
      remaining: -1,
      resetTime,
    };
  }

  const { limit, record, today, key } = evaluateDailyLimit(clientId, plan, config);

  // 日付が変わった or 初回
  if (!record || record.date !== today) {
    store[key] = { count: 1, date: today };
    return {
      success: true,
      used: 1,
      limit,
      remaining: limit - 1,
      resetTime,
    };
  }

  // 上限到達
  if (record.count >= limit) {
    return {
      success: false,
      used: record.count,
      limit,
      remaining: 0,
      resetTime,
    };
  }

  // カウント増加
  record.count += 1;
  return {
    success: true,
    used: record.count,
    limit,
    remaining: limit - record.count,
    resetTime,
  };
}

export function checkDailyLimit(
  clientId: string,
  plan: UserPlan,
  config: DailyLimitConfig
): DailyLimitResult {
  return consumeDailyLimit(clientId, plan, config);
}

/**
 * リクエストヘッダーからプランを取得
 */
export function getPlanFromHeader(headerValue: string | null): UserPlan {
  if (headerValue === 'master') return 'master';
  if (headerValue === 'pro') return 'pro';
  if (headerValue === 'plus') return 'plus';
  return 'free';
}

/**
 * 日次上限レスポンスヘッダーを生成
 */
export function dailyLimitHeaders(result: DailyLimitResult): Record<string, string> {
  return {
    'X-DailyLimit-Limit': result.limit.toString(),
    'X-DailyLimit-Used': result.used.toString(),
    'X-DailyLimit-Remaining': result.remaining.toString(),
    'X-DailyLimit-Reset': new Date(result.resetTime).toISOString(),
  };
}

/**
 * 古いレコードをクリーンアップ（メモリリーク防止）
 */
function cleanupOldRecords(): void {
  const today = getJSTDateString();
  for (const key of Object.keys(store)) {
    if (store[key].date !== today) {
      delete store[key];
    }
  }
}

// 10分ごとにクリーンアップ
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupOldRecords, 10 * 60 * 1000);
}

/**
 * エンドポイント別の日次上限設定
 */
export const DAILY_LIMITS = {
  EVALUATE_SPEAKING: {
    endpoint: 'evaluate-speaking',
    limits: { free: 0, plus: 50, pro: -1 },
  },
  AI_DRILL_JUDGE: {
    endpoint: 'ai-drill-judge',
    limits: { free: 0, plus: 0, pro: 100 },
  },
  AI_DRILL_GENERATE: {
    endpoint: 'ai-drill-generate',
    limits: { free: 0, plus: 0, pro: 100 },
  },
  CONVERSATION: {
    endpoint: 'conversation',
    limits: { free: 0, plus: 0, pro: 100 },
  },
  TTS: {
    endpoint: 'tts',
    limits: { free: 0, plus: 200, pro: -1 },
  },
  ASK_AI: {
    endpoint: 'ask-ai',
    limits: { free: 0, plus: 0, pro: 100 },
  },
  GENERATE_SENTENCES: {
    endpoint: 'generate-sentences',
    limits: { free: 0, plus: 0, pro: 100 },
  },
} as const;
