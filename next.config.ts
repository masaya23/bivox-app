import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Capacitorビルドかどうかを環境変数で判定
const isCapacitorBuild = process.env.BUILD_TARGET === 'capacitor';

const nextConfig: NextConfig = {
  // Capacitor用に静的HTMLエクスポートを有効化（Capacitorビルド時のみ）
  ...(isCapacitorBuild && { output: 'export' }),

  // 静的エクスポート時は画像最適化を無効化
  images: {
    unoptimized: true,
  },

  // トレーリングスラッシュ: Web版はtrue、Capacitorビルドはfalse
  // Capacitorの内蔵WebViewサーバーはディレクトリのindex.htmlを解決できないため、
  // Capacitorビルドではフラットなhtmlファイル（auth/register.html等）を生成する
  trailingSlash: !isCapacitorBuild,

  // CORS設定（Capacitorアプリからのリクエストを許可）- 静的エクスポート時は無効
  ...(!isCapacitorBuild && {
    async headers() {
      return [
        {
          // APIルートに対してCORSヘッダーを設定
          source: '/api/:path*',
          headers: [
            {
              key: 'Access-Control-Allow-Origin',
              // Capacitorのオリジン（iOS: capacitor://localhost, Android: http://localhost）
              value: '*',
            },
            {
              key: 'Access-Control-Allow-Methods',
              value: 'GET, POST, PUT, DELETE, OPTIONS',
            },
            {
              key: 'Access-Control-Allow-Headers',
              value: 'Content-Type, Authorization, X-Requested-With, X-User-Plan, X-App-User-Id',
            },
            {
              key: 'Access-Control-Max-Age',
              value: '86400',
            },
          ],
        },
      ];
    },
  }),
};

// Sentry統合（Capacitorビルド時はスキップ）
export default isCapacitorBuild
  ? nextConfig
  : withSentryConfig(nextConfig, {
      // ソースマップをSentryにアップロード（ビルド時）
      silent: true,
      // 組織・プロジェクト設定（Sentry CLIで使用）
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      // ソースマップ設定
      sourcemaps: {
        deleteSourcemapsAfterUpload: true,
      },
    });
