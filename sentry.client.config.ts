import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // パフォーマンス監視（サンプリングレート）
  tracesSampleRate: 0.1, // 10%のリクエストをトレース

  // セッションリプレイ（エラー時のみ）
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0,

  // 開発環境ではSentryを無効化
  enabled: process.env.NODE_ENV === 'production',

  // 環境タグ
  environment: process.env.NODE_ENV,

  // 不要なエラーをフィルタリング
  ignoreErrors: [
    // ブラウザ拡張機能のエラー
    'ResizeObserver loop',
    'Non-Error promise rejection',
    // ネットワークエラー（ユーザーのオフラインなど）
    'Failed to fetch',
    'NetworkError',
    'Load failed',
    // 音声再生関連（ユーザー操作なしでの再生ブロック）
    'The play() request was interrupted',
    'play() failed because the user',
  ],
});
