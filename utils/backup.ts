/**
 * バックアップ・リストア機能
 */

export interface BackupData {
  version: string;
  exportDate: string;
  trainingHistory: any[];
  trainingStats: any;
  streakData: any;
  srsCards: any[];
  settings: any;
}

/**
 * 全データをエクスポート
 */
export function exportData(): BackupData {
  const srsCards: any[] = [];

  // SRSカードを収集
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('srs_')) {
      const value = localStorage.getItem(key);
      if (value) {
        srsCards.push({
          key,
          value: JSON.parse(value),
        });
      }
    }
  }

  const backupData: BackupData = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    trainingHistory: JSON.parse(
      localStorage.getItem('trainingHistory') || '[]'
    ),
    trainingStats: JSON.parse(localStorage.getItem('trainingStats') || 'null'),
    streakData: JSON.parse(localStorage.getItem('streakData') || 'null'),
    srsCards,
    settings: JSON.parse(localStorage.getItem('appSettings') || 'null'),
  };

  return backupData;
}

/**
 * データをJSON文字列でダウンロード
 */
export function downloadBackup(): void {
  const data = exportData();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `english-app-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * バックアップデータをインポート
 */
export function importData(backupData: BackupData): boolean {
  try {
    // トレーニング履歴
    if (backupData.trainingHistory) {
      localStorage.setItem(
        'trainingHistory',
        JSON.stringify(backupData.trainingHistory)
      );
    }

    // 統計
    if (backupData.trainingStats) {
      localStorage.setItem(
        'trainingStats',
        JSON.stringify(backupData.trainingStats)
      );
    }

    // Streak
    if (backupData.streakData) {
      localStorage.setItem('streakData', JSON.stringify(backupData.streakData));
    }

    // SRSカード
    if (backupData.srsCards) {
      backupData.srsCards.forEach((card) => {
        localStorage.setItem(card.key, JSON.stringify(card.value));
      });
    }

    // 設定
    if (backupData.settings) {
      localStorage.setItem('appSettings', JSON.stringify(backupData.settings));
    }

    return true;
  } catch (error) {
    console.error('Import failed:', error);
    return false;
  }
}

/**
 * 全データを削除（リセット）
 */
export function clearAllData(): void {
  if (
    confirm(
      '全てのデータを削除します。この操作は取り消せません。よろしいですか？'
    )
  ) {
    localStorage.clear();
    alert('全データを削除しました。');
    window.location.reload();
  }
}
