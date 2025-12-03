/**
 * クライアント識別子の取得
 * NextJsのAPIルートでリクエスト元を識別するためのヘルパー
 */

import { headers } from 'next/headers';

/**
 * リクエストからクライアント識別子を取得
 * IPアドレス + User-Agent のハッシュを使用
 */
export async function getClientId(): Promise<string> {
  const headersList = await headers();

  // IPアドレスの取得（プロキシ経由の場合も考慮）
  const forwardedFor = headersList.get('x-forwarded-for');
  const realIp = headersList.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0] || realIp || 'unknown';

  // User-Agentの取得
  const userAgent = headersList.get('user-agent') || 'unknown';

  // シンプルなハッシュ関数（セキュリティ用途ではない）
  const hash = simpleHash(`${ip}-${userAgent}`);

  return hash;
}

/**
 * シンプルなハッシュ関数
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32bitに変換
  }
  return Math.abs(hash).toString(36);
}
