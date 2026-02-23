import {
  TrialHistoryRecord,
  TrialStatus,
  AuthProvider,
  TRIAL_CONFIG,
} from '@/types/auth';

// ローカルストレージキー（開発用モック）
const TRIAL_HISTORY_KEY = 'englishapp_trial_history';
const CURRENT_USER_TRIAL_KEY = 'englishapp_current_trial';

/**
 * メールアドレスをハッシュ化
 * ※本番環境ではサーバーサイドで実行すべき
 */
export async function hashEmail(email: string): Promise<string> {
  const normalizedEmail = email.toLowerCase().trim();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalizedEmail);

  // Web Crypto APIを使用
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

/**
 * トライアル履歴をチェック
 * ※本番環境ではサーバーサイドのDBクエリに置き換え
 */
export function getTrialHistory(): TrialHistoryRecord[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(TRIAL_HISTORY_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    console.warn('Failed to load trial history');
  }
  return [];
}

/**
 * トライアル履歴を保存
 * ※本番環境ではサーバーサイドのDB挿入に置き換え
 */
export function saveTrialHistory(records: TrialHistoryRecord[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(TRIAL_HISTORY_KEY, JSON.stringify(records));
  } catch {
    console.warn('Failed to save trial history');
  }
}

/**
 * 指定されたメールハッシュでトライアル履歴を検索
 */
export function findTrialByEmailHash(emailHash: string): TrialHistoryRecord | null {
  const history = getTrialHistory();
  return history.find(record => record.emailHash === emailHash) || null;
}

/**
 * トライアルが利用可能かチェック
 */
export async function canUseTrial(email: string): Promise<{
  canUse: boolean;
  reason?: string;
  previousUsage?: TrialHistoryRecord;
}> {
  const emailHash = await hashEmail(email);
  const previousUsage = findTrialByEmailHash(emailHash);

  if (previousUsage) {
    return {
      canUse: false,
      reason: 'このメールアドレスでは既に無料トライアルを利用済みです。',
      previousUsage,
    };
  }

  return { canUse: true };
}

/**
 * トライアルを開始
 */
export async function startTrial(
  email: string,
  provider: AuthProvider
): Promise<TrialHistoryRecord> {
  const emailHash = await hashEmail(email);
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + TRIAL_CONFIG.DURATION_DAYS);

  const record: TrialHistoryRecord = {
    emailHash,
    usedAt: now.toISOString(),
    provider,
    expiresAt: expiresAt.toISOString(),
  };

  // 履歴に追加
  const history = getTrialHistory();
  history.push(record);
  saveTrialHistory(history);

  // 現在のトライアル情報を保存
  localStorage.setItem(CURRENT_USER_TRIAL_KEY, JSON.stringify(record));

  return record;
}

/**
 * 現在のトライアル状態を取得
 */
export function getCurrentTrialStatus(): TrialStatus {
  if (typeof window === 'undefined') {
    return {
      hasUsedTrial: false,
      isCurrentlyInTrial: false,
      trialStartDate: null,
      trialEndDate: null,
      daysRemaining: 0,
    };
  }

  try {
    const stored = localStorage.getItem(CURRENT_USER_TRIAL_KEY);
    if (!stored) {
      return {
        hasUsedTrial: false,
        isCurrentlyInTrial: false,
        trialStartDate: null,
        trialEndDate: null,
        daysRemaining: 0,
      };
    }

    const record: TrialHistoryRecord = JSON.parse(stored);
    const now = new Date();
    const expiresAt = new Date(record.expiresAt);
    const isExpired = now > expiresAt;

    const daysRemaining = isExpired
      ? 0
      : Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      hasUsedTrial: true,
      isCurrentlyInTrial: !isExpired,
      trialStartDate: record.usedAt,
      trialEndDate: record.expiresAt,
      daysRemaining,
    };
  } catch {
    return {
      hasUsedTrial: false,
      isCurrentlyInTrial: false,
      trialStartDate: null,
      trialEndDate: null,
      daysRemaining: 0,
    };
  }
}

/**
 * アカウント削除時にトライアル履歴を保持
 * ※本番環境ではアカウント削除処理に組み込む
 */
export async function preserveTrialHistoryOnDeletion(email: string): Promise<void> {
  const emailHash = await hashEmail(email);

  // 現在のユーザーのトライアル情報をクリア（UIから非表示に）
  localStorage.removeItem(CURRENT_USER_TRIAL_KEY);

  // トライアル履歴自体は保持される（getTrialHistory()で残る）
  console.log(`Trial history preserved for hash: ${emailHash.substring(0, 8)}...`);
}

/**
 * 不審なアクティビティを検出
 * （同一IPからの大量登録など）
 */
export function detectSuspiciousActivity(): {
  isSuspicious: boolean;
  reason?: string;
} {
  // 開発用モック：常にfalseを返す
  // 本番環境では以下をチェック：
  // - 同一IPからの短時間での大量登録
  // - 使い捨てメールドメインの使用
  // - デバイスフィンガープリントの重複

  return { isSuspicious: false };
}

/**
 * 使い捨てメールドメインかチェック
 */
const DISPOSABLE_DOMAINS = [
  'tempmail.com',
  'throwaway.email',
  'guerrillamail.com',
  'mailinator.com',
  '10minutemail.com',
  // 追加のドメインはサーバーサイドで管理
];

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;

  return DISPOSABLE_DOMAINS.some(d => domain.includes(d));
}

/**
 * デバッグ用：トライアル履歴をクリア
 */
export function clearTrialHistory(): void {
  localStorage.removeItem(TRIAL_HISTORY_KEY);
  localStorage.removeItem(CURRENT_USER_TRIAL_KEY);
}
