/**
 * Capacitor ポストビルドスクリプト
 *
 * ビルド後にAPIディレクトリを元に戻す
 */

const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, '..', 'app', 'api');
const apiDirBackup = path.join(__dirname, '..', 'app', '_api_backup');
const authDir = path.join(__dirname, '..', 'app', 'auth');
const authDirBackup = path.join(__dirname, '..', 'app', '_auth_backup');

console.log('=== Capacitor Post-build Script ===');

// 1. APIディレクトリを元に戻す
if (fs.existsSync(apiDirBackup)) {
  console.log('Restoring app/_api_backup to app/api...');
  fs.renameSync(apiDirBackup, apiDir);
  console.log('Done.');
} else {
  console.log('app/_api_backup not found, nothing to restore.');
}

// 2. 認証ディレクトリを元に戻す（必要な場合）
// if (fs.existsSync(authDirBackup)) {
//   console.log('Restoring app/_auth_backup to app/auth...');
//   fs.renameSync(authDirBackup, authDir);
//   console.log('Done.');
// }

console.log('Post-build cleanup complete!');
console.log('');
