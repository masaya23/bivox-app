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

// ユーザープラン（日次上限チェック用）
let _userPlan: string = 'free';

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

// 日次上限アラートのデバウンス用タイムスタンプ
let _lastDailyLimitAlert = 0;

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

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-User-Plan': _userPlan,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    // 日次上限到達時の通知
    if (response.status === 429 && error.dailyLimitReached && typeof window !== 'undefined') {
      const now = Date.now();
      if (now - _lastDailyLimitAlert > 5000) {
        _lastDailyLimitAlert = now;
        setTimeout(() => {
          alert(error.error || '本日の利用上限に達しました。明日またお試しください。');
        }, 0);
      }
    }
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

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-User-Plan': _userPlan,
      ...options.headers,
    },
  });

  // 日次上限到達時の通知
  if (response.status === 429) {
    try {
      const cloned = response.clone();
      const body = await cloned.json();
      if (body.dailyLimitReached && typeof window !== 'undefined') {
        // 短時間に複数回表示しないようにデバウンス
        const now = Date.now();
        if (now - _lastDailyLimitAlert > 5000) {
          _lastDailyLimitAlert = now;
          setTimeout(() => {
            alert(body.error || '本日の利用上限に達しました。明日またお試しください。');
          }, 0);
        }
      }
    } catch {
      // JSONパース失敗は無視
    }
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
