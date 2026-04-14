// 認証とトライアル管理の型定義

// ユーザー認証情報
export interface AuthUser {
  id: string;
  email: string;
  emailHash: string; // SHA-256 hash for trial history lookup
  provider: AuthProvider;
  createdAt: string;
  isEmailVerified: boolean;
  isMaster: boolean; // マスターアカウント（開発者用：全機能無料開放）
  linkedProviders: AuthProvider[]; // 連携済みの認証プロバイダー
}

// 認証プロバイダー
export type AuthProvider = 'email' | 'google' | 'apple' | 'anonymous';

// トライアル履歴（永続化される）
export interface TrialHistoryRecord {
  emailHash: string;        // メールアドレスのハッシュ値
  usedAt: string;           // トライアル開始日時
  provider: AuthProvider;   // 登録時のプロバイダー
  expiresAt: string;        // トライアル終了日時
}

// トライアル状態
export interface TrialStatus {
  hasUsedTrial: boolean;           // 過去にトライアルを使用したか
  isCurrentlyInTrial: boolean;     // 現在トライアル中か
  trialStartDate: string | null;   // トライアル開始日
  trialEndDate: string | null;     // トライアル終了日
  daysRemaining: number;           // 残り日数（0なら終了）
}

// サブスクリプション検証結果
export interface SubscriptionValidation {
  isValid: boolean;
  tier: 'free' | 'plus' | 'pro';
  expiresAt: string | null;
  isTrialPeriod: boolean;
  receipt?: StoreReceipt;
}

// ストアレシート情報
export interface StoreReceipt {
  store: 'apple' | 'google';
  productId: string;
  purchaseDate: string;
  expiresDate: string;
  isTrialPeriod: boolean;
  isCancelled: boolean;
  originalTransactionId: string;
}

// 認証エラー
export interface AuthError {
  code: AuthErrorCode;
  message: string;
}

export type AuthErrorCode =
  | 'EMAIL_ALREADY_EXISTS'
  | 'TRIAL_ALREADY_USED'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_NOT_VERIFIED'
  | 'ACCOUNT_DISABLED'
  | 'RECEIPT_VALIDATION_FAILED'
  | 'SUBSCRIPTION_EXPIRED';

// トライアル設定
export const TRIAL_CONFIG = {
  DURATION_DAYS: 7,           // 無料トライアル期間
  GRACE_PERIOD_DAYS: 3,       // 支払い猶予期間
  HASH_ALGORITHM: 'SHA-256',  // ハッシュアルゴリズム
} as const;

// 管理者メールアドレスかどうかを判定（環境変数から取得）
// 第1関門：メールアドレスの照合
export function isAdminEmail(email: string): boolean {
  if (process.env.NEXT_PUBLIC_ENABLE_MASTER_MODE !== 'true') return false;
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  if (!adminEmail) return false;
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedAdminEmail = adminEmail.toLowerCase().trim();
  return normalizedEmail === normalizedAdminEmail;
}

// 管理者秘密キーを検証（環境変数から取得）
// 第2関門：秘密のコマンド入力
export function verifyAdminSecretKey(inputKey: string): boolean {
  if (process.env.NEXT_PUBLIC_ENABLE_MASTER_MODE !== 'true') return false;
  const secretKey = process.env.NEXT_PUBLIC_ADMIN_SECRET_KEY;
  if (!secretKey) return false;
  return inputKey === secretKey;
}

// 旧互換性のため残す（ただし環境変数を使用）
export function isMasterEmail(email: string): boolean {
  return isAdminEmail(email);
}
