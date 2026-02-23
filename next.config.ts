import type { NextConfig } from "next";

// Capacitorビルドかどうかを環境変数で判定
const isCapacitorBuild = process.env.BUILD_TARGET === 'capacitor';

const nextConfig: NextConfig = {
  // Capacitor用に静的HTMLエクスポートを有効化（Capacitorビルド時のみ）
  ...(isCapacitorBuild && { output: 'export' }),

  // 静的エクスポート時は画像最適化を無効化
  images: {
    unoptimized: true,
  },

  // トレーリングスラッシュを有効化（Capacitorでのルーティング対応）
  trailingSlash: true,

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
              value: 'Content-Type, Authorization, X-Requested-With',
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

export default nextConfig;
