// 例文データの型定義
export interface Sentence {
  id: string;
  jp: string; // 日本語
  en: string; // 英語
  tags: string[]; // タグ（仕事/日常/旅行など）
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'; // CEFR レベル
  nextDue?: number; // SRS用: 次回出題日時（timestamp）
  correctCount?: number; // 正解回数
  incorrectCount?: number; // 不正解回数
  lastReviewed?: number; // 最終復習日時
}

// API レスポンス型
export interface GenerateSentencesResponse {
  success: boolean;
  sentences?: Sentence[];
  error?: string;
}

// 生成リクエスト型
export interface GenerateSentencesRequest {
  count?: number; // 生成する例文数（デフォルト: 5）
  level?: Sentence['level']; // レベル指定
  tags?: string[]; // タグ指定
}
