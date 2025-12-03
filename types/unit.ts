/**
 * Unit学習機能の型定義
 */

import { Sentence } from './sentence';

export interface Part {
  id: string; // 例: 'jh1-u1-p1'
  partNumber: number; // Part番号
  title: string; // 例: 'am/is/are'
  description: string; // 例: 'be動詞の基本形'
  sentences: Sentence[]; // 例文リスト
  priority?: 'A' | 'B' | 'C'; // 優先度（A:重要, B:標準, C:補足）
  weight?: number; // 重み（A:3, B:2, C:1）
}

export interface Unit {
  id: string; // 例: 'jh1-unit1'
  title: string; // 例: 'Unit 1'
  description: string; // 例: 'be動詞と指示代名詞'
  grade: 'junior-high-1' | 'junior-high-2' | 'junior-high-3'; // 学年
  unitNumber: number; // Unit番号
  parts: Part[]; // Part リスト
}

export interface UnitCategory {
  id: string;
  name: string;
  units: Unit[];
}

export type TabFilter = 'all' | 'junior-high-1' | 'junior-high-2' | 'junior-high-3';

export interface UnitProgress {
  unitId: string;
  completedCount: number; // 完了した例文数
  totalCount: number; // 総例文数
  lastStudied: string | null; // 最後に学習した日時
}

export interface PartProgress {
  partId: string;
  completedCount: number; // 完了した例文数
  totalCount: number; // 総例文数
  lastStudied: string | null; // 最後に学習した日時
}
