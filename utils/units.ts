/**
 * Unit学習機能のユーティリティ
 */

import { Unit, Part, TabFilter } from '@/types/unit';
import { Sentence } from '@/types/sentence';
import unit1Data from '@/data/units/junior-high-1/unit1.json';
import unit2Data from '@/data/units/junior-high-2/unit2.json';
import unit3Data from '@/data/units/junior-high-3/unit3.json';

// すべてのUnitデータ
const ALL_UNITS: Unit[] = [
  unit1Data as Unit,
  unit2Data as Unit,
  unit3Data as Unit,
];

/**
 * すべてのUnitを取得
 */
export function getAllUnits(): Unit[] {
  return ALL_UNITS;
}

/**
 * フィルタに基づいてUnitを取得
 */
export function getUnitsByFilter(filter: TabFilter): Unit[] {
  if (filter === 'all') {
    return ALL_UNITS;
  }
  return ALL_UNITS.filter((unit) => unit.grade === filter);
}

/**
 * Unit IDでUnitを取得
 */
export function getUnitById(unitId: string): Unit | undefined {
  return ALL_UNITS.find((unit) => unit.id === unitId);
}

/**
 * Part IDでPartを取得
 */
export function getPartById(unitId: string, partId: string): Part | undefined {
  const unit = getUnitById(unitId);
  if (!unit) return undefined;
  return unit.parts.find((part) => part.id === partId);
}

/**
 * 学年名を取得
 */
export function getGradeName(grade: string): string {
  const gradeNames: Record<string, string> = {
    'junior-high-1': '中学1年',
    'junior-high-2': '中学2年',
    'junior-high-3': '中学3年',
  };
  return gradeNames[grade] || grade;
}

/**
 * 学年からUnitを取得（1学年=1Unit）
 */
export function getUnitByGrade(grade: TabFilter): Unit | undefined {
  if (grade === 'all') return undefined;
  return ALL_UNITS.find((unit) => unit.grade === grade);
}

/**
 * 学年のPart一覧を取得
 */
export function getPartsByGrade(grade: TabFilter): Part[] {
  if (grade === 'all') {
    return ALL_UNITS.flatMap((unit) => unit.parts);
  }
  const unit = getUnitByGrade(grade);
  return unit ? unit.parts : [];
}

/**
 * 学年からUnit IDを取得
 */
export function getUnitIdByGrade(grade: TabFilter): string | undefined {
  const unit = getUnitByGrade(grade);
  return unit?.id;
}

/**
 * Unitの総例文数を取得
 */
export function getUnitTotalSentences(unit: Unit): number {
  return unit.parts.reduce((total, part) => total + part.sentences.length, 0);
}

/**
 * 次のPartを取得（同一Unit内で次のpartNumberを探す）
 */
export function getNextPart(unitId: string, currentPartId: string): Part | undefined {
  const unit = getUnitById(unitId);
  if (!unit) return undefined;
  const currentPart = unit.parts.find((p) => p.id === currentPartId);
  if (!currentPart) return undefined;
  const sorted = [...unit.parts].sort((a, b) => a.partNumber - b.partNumber);
  const currentIdx = sorted.findIndex((p) => p.id === currentPartId);
  if (currentIdx < 0 || currentIdx >= sorted.length - 1) return undefined;
  return sorted[currentIdx + 1];
}

/**
 * Partの例文をシャッフル
 */
export function shufflePartSentences(part: Part): Part {
  const shuffled = [...part.sentences];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return {
    ...part,
    sentences: shuffled,
  };
}

/**
 * Unit内の全Partの例文を結合
 */
export function combineUnitParts(unit: Unit, shuffle: boolean = false): Sentence[] {
  const allSentences = unit.parts.flatMap((part) => part.sentences);

  if (shuffle) {
    return shuffleSentences(allSentences);
  }

  return allSentences;
}

/**
 * 複数のUnitの例文を結合
 */
export function combineUnits(units: Unit[], shuffle: boolean = false): Sentence[] {
  const combinedSentences = units.flatMap((unit) =>
    unit.parts.flatMap((part) => part.sentences)
  );

  if (shuffle) {
    return shuffleSentences(combinedSentences);
  }

  return combinedSentences;
}

/**
 * 例文をシャッフル
 */
function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function shuffleSentences<T>(array: T[], rng: () => number = Math.random): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * 優先度重み付けで例文を選択
 *
 * @param unit - Unit
 * @param count - 選択する問題数（10/25/50/75/100）
 * @param shuffle - シャッフルするか
 * @returns 選択された例文リスト
 */
export function selectSentencesWithPriority(
  unit: Unit,
  count: number,
  shuffle: boolean = false,
  seed?: number
): Sentence[] {
  const rng = shuffle && typeof seed === 'number' ? createSeededRng(seed) : Math.random;
  // 優先度別にパートを分類
  const priorityA = unit.parts.filter(p => p.priority === 'A');
  const priorityB = unit.parts.filter(p => p.priority === 'B');
  const priorityC = unit.parts.filter(p => p.priority === 'C');

  // 各優先度から選択する問題数を計算
  // A:B:C = 3:2:1 の比率
  const totalWeight =
    priorityA.length * 3 +
    priorityB.length * 2 +
    priorityC.length * 1;

  const countA = Math.round((count * priorityA.length * 3) / totalWeight);
  const countB = Math.round((count * priorityB.length * 2) / totalWeight);
  const countC = count - countA - countB;

  // 各優先度から例文を選択
  const selectedSentences: Sentence[] = [];

  // Priority A から選択
  if (countA > 0 && priorityA.length > 0) {
    const aSentences = priorityA.flatMap(part => part.sentences);
    const selected = shuffle ? shuffleSentences(aSentences, rng) : aSentences;
    selectedSentences.push(...selected.slice(0, countA));
  }

  // Priority B から選択
  if (countB > 0 && priorityB.length > 0) {
    const bSentences = priorityB.flatMap(part => part.sentences);
    const selected = shuffle ? shuffleSentences(bSentences, rng) : bSentences;
    selectedSentences.push(...selected.slice(0, countB));
  }

  // Priority C から選択
  if (countC > 0 && priorityC.length > 0) {
    const cSentences = priorityC.flatMap(part => part.sentences);
    const selected = shuffle ? shuffleSentences(cSentences, rng) : cSentences;
    selectedSentences.push(...selected.slice(0, countC));
  }

  // 最終的にシャッフル
  return shuffle ? shuffleSentences(selectedSentences, rng) : selectedSentences;
}

/**
 * 複数Unitから優先度重み付けで例文を選択
 *
 * @param units - Unitリスト
 * @param count - 選択する問題数
 * @param shuffle - シャッフルするか
 * @returns 選択された例文リスト
 */
export function selectSentencesFromMultipleUnits(
  units: Unit[],
  count: number,
  shuffle: boolean = false,
  seed?: number
): Sentence[] {
  const rng = shuffle && typeof seed === 'number' ? createSeededRng(seed) : Math.random;
  // 全Unitのパートを優先度別に分類
  const allParts = units.flatMap(unit => unit.parts);
  const priorityA = allParts.filter(p => p.priority === 'A');
  const priorityB = allParts.filter(p => p.priority === 'B');
  const priorityC = allParts.filter(p => p.priority === 'C');

  // 各優先度から選択する問題数を計算
  const totalWeight =
    priorityA.length * 3 +
    priorityB.length * 2 +
    priorityC.length * 1;

  const countA = Math.round((count * priorityA.length * 3) / totalWeight);
  const countB = Math.round((count * priorityB.length * 2) / totalWeight);
  const countC = count - countA - countB;

  // 各優先度から例文を選択
  const selectedSentences: Sentence[] = [];

  // Priority A から選択
  if (countA > 0 && priorityA.length > 0) {
    const aSentences = priorityA.flatMap(part => part.sentences);
    const selected = shuffle ? shuffleSentences(aSentences, rng) : aSentences;
    selectedSentences.push(...selected.slice(0, countA));
  }

  // Priority B から選択
  if (countB > 0 && priorityB.length > 0) {
    const bSentences = priorityB.flatMap(part => part.sentences);
    const selected = shuffle ? shuffleSentences(bSentences, rng) : bSentences;
    selectedSentences.push(...selected.slice(0, countB));
  }

  // Priority C から選択
  if (countC > 0 && priorityC.length > 0) {
    const cSentences = priorityC.flatMap(part => part.sentences);
    const selected = shuffle ? shuffleSentences(cSentences, rng) : cSentences;
    selectedSentences.push(...selected.slice(0, countC));
  }

  // 最終的にシャッフル
  return shuffle ? shuffleSentences(selectedSentences, rng) : selectedSentences;
}
