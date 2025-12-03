'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  downloadBackup,
  importData,
  clearAllData,
  BackupData,
} from '@/utils/backup';

export default function SettingsPage() {
  const [importStatus, setImportStatus] = useState<string>('');
  const [storageSize, setStorageSize] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // クライアントサイドでのみlocalStorageにアクセス
  useEffect(() => {
    const getStorageInfo = () => {
      let totalSize = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            totalSize += key.length + value.length;
          }
        }
      }
      // バイトからKBに変換
      return Math.round(totalSize / 1024);
    };

    setStorageSize(getStorageInfo());
  }, []);

  const handleExport = () => {
    downloadBackup();
    alert('バックアップファイルをダウンロードしました');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const backupData: BackupData = JSON.parse(text);

      if (!backupData.version || !backupData.exportDate) {
        setImportStatus('無効なバックアップファイルです');
        return;
      }

      const success = importData(backupData);
      if (success) {
        setImportStatus('データを復元しました。ページを再読み込みします...');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setImportStatus('データの復元に失敗しました');
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportStatus('ファイルの読み込みに失敗しました');
    }

    // ファイル入力をリセット
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearData = () => {
    clearAllData();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl p-8 md:p-12">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-black text-gray-800 mb-2">
            設定
          </h1>
          <p className="text-gray-600">データの管理とバックアップ</p>
        </div>

        {/* ストレージ情報 */}
        <div className="bg-blue-50 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-3">
            💾 ストレージ情報
          </h2>
          <div className="text-center">
            <p className="text-3xl font-black text-blue-600">{storageSize} KB</p>
            <p className="text-sm text-gray-600 mt-1">使用中</p>
          </div>
        </div>

        {/* バックアップセクション */}
        <div className="bg-green-50 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-3">
            📦 バックアップ
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            学習データをファイルに保存できます。他のデバイスでデータを復元する際に使用します。
          </p>
          <button
            onClick={handleExport}
            className="w-full py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-colors"
          >
            データをエクスポート
          </button>
        </div>

        {/* リストアセクション */}
        <div className="bg-purple-50 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-3">
            📥 データ復元
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            バックアップファイルから学習データを復元します。現在のデータは上書きされます。
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={handleImportClick}
            className="w-full py-3 bg-purple-500 text-white font-bold rounded-xl hover:bg-purple-600 transition-colors"
          >
            バックアップから復元
          </button>
          {importStatus && (
            <p className="mt-3 text-center text-sm text-gray-700">
              {importStatus}
            </p>
          )}
        </div>

        {/* データ削除セクション */}
        <div className="bg-red-50 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-3">
            🗑️ データ削除
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            全ての学習データを削除します。この操作は取り消せません。
          </p>
          <button
            onClick={handleClearData}
            className="w-full py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors"
          >
            全データを削除
          </button>
        </div>

        {/* データ内容の詳細 */}
        <div className="bg-gray-50 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-3">
            📋 バックアップに含まれるデータ
          </h2>
          <ul className="text-sm text-gray-700 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span>トレーニング履歴（過去のセッション記録）</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span>学習統計（総セッション数、正解率など）</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span>連続学習記録（Streakデータ）</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span>SRSカード（間隔反復学習データ）</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span>アプリ設定</span>
            </li>
          </ul>
        </div>

        {/* 戻るボタン */}
        <Link
          href="/"
          className="block w-full py-4 bg-gray-200 text-gray-800 font-bold rounded-2xl text-center hover:bg-gray-300 transition-colors"
        >
          ホームに戻る
        </Link>
      </div>
    </div>
  );
}
