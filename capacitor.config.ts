import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shunkan.eikaiwa',
  appName: 'Bivox - 瞬間英会話 -',
  webDir: 'out',

  // サーバー設定
  server: {
    // 本番環境では静的ファイルを使用
    androidScheme: 'https',
    iosScheme: 'capacitor',
    // ナビゲーションをアプリ内で処理
    allowNavigation: ['*'],
  },

  // iOS固有の設定
  ios: {
    // ステータスバーのスタイル
    contentInset: 'automatic',
    // スクロール設定
    scrollEnabled: true,
    // キーボード表示時の動作
    preferredContentMode: 'mobile',
  },

  // Android固有の設定
  android: {
    // バックグラウンド色
    backgroundColor: '#ffffff',
    // ハードウェアバックボタンの動作
    allowMixedContent: true,
  },

  // プラグイン設定
  plugins: {
    // スプラッシュスクリーン（後で追加）
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;
