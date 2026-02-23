# Capacitor ビルド手順

## 概要

このアプリはCapacitorを使用してiOS/Androidネイティブアプリとしてビルドできます。
RevenueCatを使用したアプリ内課金に対応しています。

## 前提条件

- Node.js 18以上
- Xcode（iOS用）
- Android Studio（Android用）

## ビルド前の準備

### 1. APIルートの一時的な移動

静的エクスポートではAPIルートが動作しないため、ビルド前にAPIディレクトリを一時的にリネームする必要があります。

```powershell
# VSCodeと開発サーバーを閉じてから実行
Rename-Item -Path "app/api" -NewName "_api_backup"
```

### 2. ビルドとSync

```bash
npm run build:cap
npx cap sync
```

### 3. APIディレクトリを元に戻す

```powershell
Rename-Item -Path "app/_api_backup" -NewName "api"
```

## プラットフォームの追加

### iOS

```bash
npx cap add ios
npx cap open ios
```

### Android

```bash
npx cap add android
npx cap open android
```

## 本番環境での設定

### 外部APIサーバー

Capacitorアプリでは内部APIが使えないため、APIサーバーを別途デプロイする必要があります。

1. Vercelに`/api`ルートをデプロイ
2. `.env.local`に`NEXT_PUBLIC_API_BASE_URL`を設定

```env
# Capacitor用
NEXT_PUBLIC_API_BASE_URL=https://your-api-server.vercel.app
```

## RevenueCat 設定

### 環境変数

`.env.local`に以下を追加：

```env
# RevenueCat APIキー
NEXT_PUBLIC_REVENUECAT_IOS_KEY=your_ios_api_key
NEXT_PUBLIC_REVENUECAT_ANDROID_KEY=your_android_api_key
```

### 商品ID

RevenueCatダッシュボードで以下の商品を設定：

- `sokkan_plus_monthly`: Plusプラン（月額800円）
- `sokkan_pro_monthly`: Proプラン（月額1480円）

### エンタイトルメント

- `plus`: Plusプランの権限
- `pro`: Proプランの権限

## 認証システム

### 現在の実装

認証はlocalStorageベースでクライアントサイドで完結しています。
Capacitorアプリでも問題なく動作します。

### セキュリティ強化（推奨）

本番環境では、以下のプラグインを使用してセキュアストレージを使用することを推奨：

```bash
npm install @capacitor/preferences
# または
npm install @aparajita/capacitor-secure-storage
```

## iOS Safe Area

アプリは自動的にiOSのノッチ/ホームインジケータに対応します。
`globals.css`に定義されたSafe Areaクラスを使用：

- `safe-area-top`: 上部パディング
- `safe-area-bottom`: 下部パディング
- `safe-area-all`: 全方向パディング

## トラブルシューティング

### パーミッションエラー

ファイルがロックされている場合：
1. VSCodeを閉じる
2. `npm run dev`を停止する
3. コマンドプロンプトで直接リネームを実行

### ビルドエラー

APIルートが原因でビルドが失敗する場合：
1. `app/api`ディレクトリを一時的に`app/_api_backup`にリネーム
2. ビルド実行
3. `app/_api_backup`を`app/api`に戻す

### RevenueCatエラー

- APIキーが設定されていることを確認
- RevenueCatダッシュボードで商品が正しく設定されていることを確認
- エンタイトルメントIDが一致していることを確認
