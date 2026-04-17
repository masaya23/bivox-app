/**
 * API呼び出しユーティリティ
 *
 * Capacitorアプリと通常のWebアプリの両方で動作するAPI呼び出しを提供
 * - Web: 相対パス(/api/xxx)を使用
 * - Capacitor: 環境変数で指定された外部APIサーバーを使用
 */

import { Capacitor } from '@capacitor/core';

// APIサーバーのベースURL
// 開発時: 空（相対パスを使用）
// 本番時（Capacitor）: 外部サーバーのURLを指定
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

const MASTER_MODE_KEY = 'englishapp_master_mode';
const GUEST_USER_KEY = 'englishapp_guest_user';
const AUTH_USER_KEY = 'englishapp_auth_user';
const SUBSCRIPTION_KEY = 'englishapp_subscription';
const NATIVE_SUBSCRIPTION_SNAPSHOT_KEY = 'englishapp_native_subscription_snapshot';

// ユーザープラン（日次上限チェック用）
let _userPlan: string = 'free';
let _userId: string | null = null;

interface StoredAuthUser {
  id?: string;
  provider?: string;
}

interface StoredSubscription {
  tier?: string;
  expiresAt?: string | null;
  userId?: string | null;
}

interface StoredNativeSubscriptionSnapshot {
  userId?: string;
  tier?: string;
  expiresAt?: string | null;
}
/**
 * APIリクエストに付与するユーザープランを設定
 * SubscriptionContextから呼び出す
 */
export function setApiUserPlan(plan: string) {
  _userPlan = plan;
}

export function getApiUserPlan() {
  return _userPlan;
}

/**
 * APIリクエストに付与するログイン済みユーザーIDを設定
 * AuthContextから呼び出す
 */
export function setApiUserId(userId: string | null) {
  _userId = userId;
}

export function getApiUserId() {
  return _userId;
}

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function safeParseJson<T>(raw: string | null): T | null {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function isUnexpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) {
    return true;
  }

  const time = new Date(expiresAt).getTime();
  if (Number.isNaN(time)) {
    return false;
  }

  return time > Date.now();
}

function normalizePlan(plan: string | null | undefined): string {
  if (plan === 'master' || plan === 'pro' || plan === 'plus') {
    return plan;
  }
  return 'free';
}

function getPersistedAuthenticatedUserId(): string | null {
  if (!canUseLocalStorage()) {
    return null;
  }

  if (localStorage.getItem(GUEST_USER_KEY)) {
    return null;
  }

  const nativeSnapshot = safeParseJson<StoredNativeSubscriptionSnapshot>(
    localStorage.getItem(NATIVE_SUBSCRIPTION_SNAPSHOT_KEY)
  );
  if (nativeSnapshot?.userId) {
    return nativeSnapshot.userId;
  }

  const subscription = safeParseJson<StoredSubscription>(
    localStorage.getItem(SUBSCRIPTION_KEY)
  );
  if (subscription?.userId) {
    return subscription.userId;
  }

  const authUser = safeParseJson<StoredAuthUser>(localStorage.getItem(AUTH_USER_KEY));
  if (authUser?.id && authUser.provider !== 'anonymous') {
    return authUser.id;
  }

  return null;
}

function getPersistedPlanForUser(userId: string): string {
  if (!canUseLocalStorage()) {
    return 'free';
  }

  const nativeSnapshot = safeParseJson<StoredNativeSubscriptionSnapshot>(
    localStorage.getItem(NATIVE_SUBSCRIPTION_SNAPSHOT_KEY)
  );
  if (
    nativeSnapshot?.userId === userId &&
    isUnexpired(nativeSnapshot.expiresAt) &&
    normalizePlan(nativeSnapshot.tier) !== 'free'
  ) {
    return normalizePlan(nativeSnapshot.tier);
  }

  const subscription = safeParseJson<StoredSubscription>(
    localStorage.getItem(SUBSCRIPTION_KEY)
  );
  if (
    subscription?.userId === userId &&
    isUnexpired(subscription.expiresAt) &&
    normalizePlan(subscription.tier) !== 'free'
  ) {
    return normalizePlan(subscription.tier);
  }

  return 'free';
}

function getEffectiveUserId(): string | null {
  if (_userId) {
    return _userId;
  }

  return getPersistedAuthenticatedUserId();
}

/**
 * 現在のユーザープランを取得（マスターモード判定を含む）
 * localStorageの購読スナップショットも参照し、
 * Reactのステート更新タイミングに依存しない
 */
function getEffectiveUserPlan(): string {
  if (_userPlan === 'master') return 'master';

  if (canUseLocalStorage()) {
    const masterMode = localStorage.getItem(MASTER_MODE_KEY);
    if (masterMode === 'true' || masterMode === 'firebase-admin') {
      return 'master';
    }

    if (localStorage.getItem(GUEST_USER_KEY)) {
      return 'free';
    }
  }

  const effectiveUserId = getEffectiveUserId();
  if (!effectiveUserId) {
    return 'free';
  }

  if (_userPlan !== 'free') {
    return _userPlan;
  }

  return getPersistedPlanForUser(effectiveUserId);
}

/**
 * Capacitorネイティブアプリかどうかをチェック
 */
export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    // Capacitorが利用できない環境ではfalseを返す
    return false;
  }
}

/**
 * APIエンドポイントのフルURLを取得
 */
export function getApiUrl(endpoint: string): string {
  // trailingSlash: true のサーバーへのPOSTリダイレクト時にCORSヘッダーが
  // 欠落する問題を防ぐため、APIパスには常にtrailing slashを付加
  const normalizedEndpoint = addTrailingSlashToApi(endpoint);

  // 環境変数が設定されている場合は常にそれを使用
  if (API_BASE_URL) {
    return `${API_BASE_URL}${normalizedEndpoint}`;
  }

  // ネイティブアプリでAPI_BASE_URLが未設定の場合は警告
  if (isNativeApp()) {
    console.warn('NEXT_PUBLIC_API_BASE_URL is not set for native app');
  }

  return normalizedEndpoint;
}

/**
 * APIエンドポイントにtrailing slashを付加
 * Next.jsのtrailingSlash: trueによる308リダイレクト時、
 * CORSヘッダーが欠落してブラウザがリクエストをブロックする問題を回避
 */
function addTrailingSlashToApi(endpoint: string): string {
  if (!endpoint.startsWith('/api/') || endpoint.endsWith('/')) {
    return endpoint;
  }
  const qIndex = endpoint.indexOf('?');
  if (qIndex === -1) {
    return endpoint + '/';
  }
  return endpoint.substring(0, qIndex) + '/' + endpoint.substring(qIndex);
}

/**
 * APIを呼び出すラッパー関数
 */
export async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = getApiUrl(endpoint);
  const effectivePlan = getEffectiveUserPlan();
  const effectiveUserId = getEffectiveUserId();

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      'X-User-Plan': effectivePlan,
      ...(effectiveUserId ? { 'X-App-User-Id': effectiveUserId } : {}),
      ...(options.headers as Record<string, string>),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API error: ${response.status}`);
  }

  return response.json();
}

/**
 * APIを呼び出すラッパー関数（Responseオブジェクトを返す版）
 * ストリーミングレスポンスやカスタム処理が必要な場合に使用
 */
export async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = getApiUrl(endpoint);
  const effectivePlan = getEffectiveUserPlan();
  const effectiveUserId = getEffectiveUserId();

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers: Record<string, string> = {
    'X-User-Plan': effectivePlan,
    ...(effectiveUserId ? { 'X-App-User-Id': effectiveUserId } : {}),
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  };

  // タイムアウト設定（60秒）- コールドスタート+API処理を考慮
  const timeoutMs = 60000;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let signal = options.signal;
  if (!signal && typeof AbortController !== 'undefined') {
    const controller = new AbortController();
    signal = controller.signal;
    timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      signal,
    });
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  return response;
}

/**
 * POST APIを呼び出す
 */
export async function apiPost<T, R = unknown>(
  endpoint: string,
  body: T
): Promise<R> {
  return apiCall<R>(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * GET APIを呼び出す
 */
export async function apiGet<R = unknown>(
  endpoint: string,
  params?: Record<string, string>
): Promise<R> {
  let url = endpoint;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url = `${endpoint}?${searchParams.toString()}`;
  }
  return apiCall<R>(url, { method: 'GET' });
}

/**
 * APIクライアントオブジェクト
 * 各エンドポイントへのアクセスを提供
 */
export const apiClient = {
  // 会話API
  conversation: {
    send: (messages: Array<{ role: string; content: string }>) =>
      apiFetch('/api/conversation', {
        method: 'POST',
        body: JSON.stringify({ messages }),
      }),
  },

  // TTS API
  tts: {
    synthesize: (text: string, voice?: string) =>
      apiFetch('/api/tts', {
        method: 'POST',
        body: JSON.stringify({ text, voice }),
      }),
  },

  // AI Drill API
  aiDrill: {
    generate: (data: { partId: string; grammarTags: string[]; referenceSentences: Array<{ japanese: string; english: string }> }) =>
      apiPost('/api/ai-drill/generate', data),
    judge: (data: { question: string; userAnswer: string; correctAnswer: string }) =>
      apiPost('/api/ai-drill/judge', data),
  },

  // Speaking評価API
  speaking: {
    evaluate: (data: { expectedText: string; spokenText: string; japanese: string }) =>
      apiPost('/api/evaluate-speaking', data),
  },
};
