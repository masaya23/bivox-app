/**
 * Capacitor プリビルドスクリプト
 *
 * 静的エクスポート前にAPIディレクトリを一時的にリネームして除外
 */

const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, '..', 'app', 'api');
const apiDirBackup = path.join(__dirname, '..', 'app', '_api_backup');
const authDir = path.join(__dirname, '..', 'app', 'auth');
const authDirBackup = path.join(__dirname, '..', 'app', '_auth_backup');

// next.config.tsのバックアップと修正
const nextConfigPath = path.join(__dirname, '..', 'next.config.ts');
const nextConfigBackupPath = path.join(__dirname, '..', 'next.config.ts.backup');

console.log('=== Capacitor Pre-build Script ===');

// 1. APIディレクトリを一時的にリネーム
if (fs.existsSync(apiDir)) {
  console.log('Temporarily moving app/api to app/_api_backup...');
  fs.renameSync(apiDir, apiDirBackup);
  console.log('Done.');
} else {
  console.log('app/api directory not found, skipping...');
}

// 2. 認証ディレクトリを一時的にリネーム（next-authがサーバーサイドを要求する場合）
// 現時点では認証はクライアントサイドなのでスキップ
// if (fs.existsSync(authDir)) {
//   console.log('Temporarily moving app/auth to app/_auth_backup...');
//   fs.renameSync(authDir, authDirBackup);
//   console.log('Done.');
// }

console.log('Pre-build preparation complete!');
console.log('');
