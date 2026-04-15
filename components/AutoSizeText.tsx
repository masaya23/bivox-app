'use client';

import React, { useMemo } from 'react';
import { loadDefaultJapaneseParser } from 'budoux';

interface AutoSizeTextProps {
  text: string;
  /** Maximum font size in px (default: 30) */
  maxFontSize?: number;
  /** Minimum font size in px (default: 20) */
  minFontSize?: number;
  /** Character count threshold to start shrinking (default: 20) */
  shrinkStart?: number;
  /** Character count where minimum font size is reached (default: 60) */
  shrinkEnd?: number;
  /** Additional CSS classes */
  className?: string;
  /** HTML tag to use (default: h2) */
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  /** Force center alignment (default: true) */
  centerAlign?: boolean;
}

// ── 定数 ──────────────────────────────────────────

const SAFE_WIDTH = 280; // モバイル画面幅375px - padding 1.5rem*2(48px) - 余白

// BudouX日本語パーサー（シングルトン）
const jaParser = loadDefaultJapaneseParser();

// 分割してはいけない複合語リスト（「の」等を含み助詞と誤認されやすいもの）
const PROTECTED_WORDS = [
  '女の子', '男の子', '気の毒', '物の怪',
  'ものの', 'このごろ', 'そのとき', 'そのまま', 'そのうち', 'そのあと',
];

// 長い文節を更に分割する際の区切り候補（て形、助詞、条件形の後など）
const SPLIT_AFTER = /([てでにをはがのもとば])/g;

// 句読点付きひらがな末尾パターン（例: "た。", "たか？", "でした。"）
const PUNCTUATION_TRAILING = /^[ぁ-ん]{1,3}[。、！？]+$/;

// ── ヘルパー関数 ──────────────────────────────────

/** カタカナ文字判定（長音符ーを含む） */
function isKatakana(ch: string): boolean {
  return /[ァ-ヴー]/.test(ch);
}

/**
 * チャンク内の文字種境界位置を検出
 * 例: "バスケットボール選手に" → カタカナ→漢字の境界 = 8 (ル→選)
 */
function findScriptBoundaries(chunk: string): number[] {
  const boundaries: number[] = [];
  for (let i = 1; i < chunk.length; i++) {
    const prevKata = isKatakana(chunk[i - 1]);
    const currKata = isKatakana(chunk[i]);
    if (prevKata !== currKata) {
      boundaries.push(i);
    }
  }
  return boundaries;
}

/**
 * 長すぎる文節を自然な位置で分割
 * 優先順位: 助詞の後 → 文字種境界（カタカナ↔非カタカナ） → 中間点（最終手段）
 */
function splitLongChunk(chunk: string, maxLen: number): string[] {
  if (chunk.length <= maxLen) return [chunk];

  // 候補1: 助詞の後
  const particleCandidates: number[] = [];
  let match;
  const re = new RegExp(SPLIT_AFTER.source, 'g');
  while ((match = re.exec(chunk)) !== null) {
    const pos = match.index + 1;
    if (pos >= 2 && pos <= chunk.length - 2) {
      particleCandidates.push(pos);
    }
  }

  // 候補2: 文字種境界（カタカナ↔漢字・ひらがな）
  const scriptCandidates = findScriptBoundaries(chunk)
    .filter(pos => pos >= 2 && pos <= chunk.length - 2);

  // 全候補を統合（重複排除・ソート）
  const allCandidates = [...new Set([...particleCandidates, ...scriptCandidates])].sort((a, b) => a - b);

  if (allCandidates.length === 0) {
    // 最終手段: 中間点で分割
    const mid = Math.ceil(chunk.length / 2);
    return [chunk.slice(0, mid), chunk.slice(mid)];
  }

  // 残りが3文字以下にならない候補を優先
  const safeCandidates = allCandidates.filter(pos => chunk.length - pos > 3);
  const pool = safeCandidates.length > 0 ? safeCandidates : allCandidates;

  // maxLenに最も近い位置を選択
  let bestPos = pool[0];
  let bestDist = Math.abs(bestPos - maxLen);
  for (const pos of pool) {
    const dist = Math.abs(pos - maxLen);
    if (dist < bestDist) {
      bestDist = dist;
      bestPos = pos;
    }
  }

  const first = chunk.slice(0, bestPos);
  const rest = chunk.slice(bestPos);

  if (rest.length > maxLen) {
    return [first, ...splitLongChunk(rest, maxLen)];
  }
  return [first, rest];
}

/**
 * 漢字熟語がチャンク境界で分断されている場合に修復（汎用ルール）
 * 隣接チャンクの境界が漢字-漢字のとき、短い方の漢字連続を長い方に移動
 *
 * 例: ["毎週", "末ずっと"]   → 末尾漢字2 vs 先頭漢字1 → "末"を左へ → ["毎週末", "ずっと"]
 * 例: ["のか不", "思議です。"] → 末尾漢字1 vs 先頭漢字2 → "不"を右へ → ["のか", "不思議です。"]
 */
function mergeKanjiCompounds(chunks: string[], maxChunkLen: number): string[] {
  const result = [...chunks];
  const isKanji = (ch: string) => /[\u4E00-\u9FFF]/.test(ch);

  for (let i = 0; i < result.length - 1; i++) {
    const tail = result[i];
    const head = result[i + 1];

    if (!tail.length || !head.length) continue;
    if (!isKanji(tail[tail.length - 1]) || !isKanji(head[0])) continue;

    // 末尾の漢字連続の長さ
    let tailKanjiLen = 0;
    for (let j = tail.length - 1; j >= 0 && isKanji(tail[j]); j--) tailKanjiLen++;

    // 先頭の漢字連続の長さ
    let headKanjiLen = 0;
    for (let j = 0; j < head.length && isKanji(head[j]); j++) headKanjiLen++;

    // 同数なら方向が不明なのでスキップ
    if (tailKanjiLen === headKanjiLen) continue;

    if (tailKanjiLen < headKanjiLen) {
      // 末尾漢字が少ない → 前チャンクから切り離し後チャンクへ移動
      const newTail = tail.slice(0, -tailKanjiLen);
      const newHead = tail.slice(-tailKanjiLen) + head;
      if (newTail.length === 0) {
        result.splice(i, 2, newHead);
        i--;
      } else if (newHead.length <= maxChunkLen) {
        result[i] = newTail;
        result[i + 1] = newHead;
      }
    } else {
      // 先頭漢字が少ない → 後チャンクから切り離し前チャンクへ移動
      // ただし漢字の直後が「ん」「っ」なら動詞活用（住んで、持って等）なので移動しない
      const afterKanji = head[headKanjiLen];
      if (afterKanji === 'ん' || afterKanji === 'っ') continue;

      const newTail = tail + head.slice(0, headKanjiLen);
      const newHead = head.slice(headKanjiLen);
      if (newHead.length === 0) {
        result.splice(i, 2, newTail);
        i--;
      } else if (newTail.length <= maxChunkLen) {
        result[i] = newTail;
        result[i + 1] = newHead;
      }
    }
  }
  return result;
}

/**
 * BudouXが分断した保護単語を再結合する
 * 例: ["好きな", "女の", "子ですか？"] → ["好きな", "女の子ですか？"]
 */
function mergeProtectedWords(chunks: string[]): string[] {
  const result = [...chunks];
  for (const word of PROTECTED_WORDS) {
    // チャンク列を連結した文字列中で保護単語の位置を探す
    let i = 0;
    while (i < result.length - 1) {
      // i番目から始まる連結でwordが境界をまたいでいるか確認
      let concat = '';
      let j = i;
      while (j < result.length && concat.length < 200) {
        concat += result[j];
        const idx = concat.indexOf(word);
        if (idx >= 0 && j > i) {
          // wordがチャンクi～jにまたがっている → iの末尾位置とjの先頭位置を確認
          // チャンクi内の開始位置
          let prefixLen = 0;
          let startChunk = i;
          for (let k = i; k <= j; k++) {
            if (prefixLen + result[k].length > idx) {
              startChunk = k;
              break;
            }
            prefixLen += result[k].length;
          }
          const offsetInStart = idx - prefixLen;
          // wordがちょうどチャンク境界で分断されている場合のみマージ
          if (offsetInStart === 0) {
            // startChunkの先頭からwordが始まる → wordを含むチャンクをマージ
            let merged = '';
            let endChunk = startChunk;
            let len = 0;
            for (let k = startChunk; k <= j; k++) {
              merged += result[k];
              len += result[k].length;
              endChunk = k;
              if (len >= word.length) break;
            }
            if (endChunk > startChunk) {
              result.splice(startChunk, endChunk - startChunk + 1, merged);
              // 再スキャンのためiをリセット
              i = startChunk;
              break;
            }
          }
        }
        j++;
      }
      i++;
    }
  }
  return result;
}

/**
 * BudouXで文節分割 → 保護単語再結合 → 長チャンク分割 → 前方マージ
 * @param maxChunkLen minFontSizeベースの絶対最大チャンク長
 */
function getJapaneseChunks(text: string, maxChunkLen: number): string[] {
  const rawChunks = mergeProtectedWords(jaParser.parse(text));

  // 長い文節を分割（文字種境界・助詞位置を考慮）
  let chunks: string[] = [];
  for (const chunk of rawChunks) {
    chunks.push(...splitLongChunk(chunk, maxChunkLen));
  }

  // 短いチャンク（≤2文字）または句読点末尾チャンクを前に吸着
  let merged: string[] = [chunks[0]];
  for (let i = 1; i < chunks.length; i++) {
    const current = chunks[i];
    const prev = merged[merged.length - 1];
    const shouldMerge =
      (current.length <= 2 || PUNCTUATION_TRAILING.test(current)) &&
      prev.length + current.length <= maxChunkLen;
    if (shouldMerge) {
      merged[merged.length - 1] = prev + current;
    } else {
      merged.push(current);
    }
  }

  // 末尾の短いチャンク（3文字以下）も前に結合
  while (merged.length > 1 && merged[merged.length - 1].length <= 3) {
    const last = merged[merged.length - 1];
    const prev = merged[merged.length - 2];
    if (prev.length + last.length > maxChunkLen) break;
    merged.pop();
    merged[merged.length - 1] = prev + last;
  }

  // 漢字熟語がチャンク境界で分断されている場合に修復
  merged = mergeKanjiCompounds(merged, maxChunkLen);

  return merged;
}

function containsJapanese(text: string): boolean {
  return /[\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(text);
}

// CJK句読点の末尾パターン（全角句読点・感嘆符・疑問符）
const CJK_TRAILING_PUNCT = /[。、！？]$/;

// ── メインコンポーネント ──────────────────────────

/**
 * フォントサイズ自動調整 + BudouX文節改行コンポーネント
 *
 * 1. BudouXで文節分割し、文字種境界を考慮してチャンクを生成
 * 2. 最長チャンクがコンテナに収まるようフォントサイズを自動縮小
 * 3. 各チャンクを<span style="whiteSpace:nowrap">で囲み、チャンク途中での改行を防止
 * 4. 句読点で終わるチャンクに負マージンを適用し中央揃えの視覚ズレを補正
 * 5. overflowWrap: break-word でフェイルセーフ
 */
export function AutoSizeText({
  text,
  maxFontSize = 30,
  minFontSize = 20,
  shrinkStart = 20,
  shrinkEnd = 60,
  className = '',
  as: Tag = 'h2',
  centerAlign = true,
}: AutoSizeTextProps) {
  const { fontSize, isJapanese, chunks } = useMemo(() => {
    const len = text.length;

    // ステップ1: 文字数ベースのフォントサイズを算出
    let charBasedSize: number;
    if (len <= shrinkStart) {
      charBasedSize = maxFontSize;
    } else if (len >= shrinkEnd) {
      charBasedSize = minFontSize;
    } else {
      const ratio = (len - shrinkStart) / (shrinkEnd - shrinkStart);
      charBasedSize = maxFontSize - ratio * (maxFontSize - minFontSize);
    }

    const jp = containsJapanese(text);

    if (!jp) {
      return { fontSize: Math.round(charBasedSize), isJapanese: false, chunks: [text] };
    }

    // ステップ2: minFontSizeベースの絶対最大チャンク長でBudouX分割
    // これ以上長いチャンクは minFontSize でも収まらないので分割する
    const absoluteMaxChunkLen = Math.max(6, Math.floor(SAFE_WIDTH / minFontSize));
    const ch = getJapaneseChunks(text, absoluteMaxChunkLen);

    // ステップ3: 最長チャンクに合わせてフォントサイズを調整
    // 最長チャンクがコンテナ幅に収まる最大フォントサイズを算出
    const longestChunkLen = Math.max(...ch.map(c => c.length));
    const chunkBasedSize = Math.floor(SAFE_WIDTH / longestChunkLen);

    // 文字数ベースとチャンクベースの小さい方を採用（minFontSizeは保証）
    const finalSize = Math.max(minFontSize, Math.min(Math.round(charBasedSize), chunkBasedSize));

    return { fontSize: finalSize, isJapanese: true, chunks: ch };
  }, [text, maxFontSize, minFontSize, shrinkStart, shrinkEnd]);

  return (
    <Tag
      className={`font-bold leading-relaxed ${className}`}
      style={{
        fontSize: `${fontSize}px`,
        textAlign: centerAlign ? 'center' : undefined,
        // フェイルセーフ: 万一の見切れを防止
        overflowWrap: 'break-word',
        paddingLeft: '1.5rem',
        paddingRight: '1.5rem',
      }}
    >
      {isJapanese
        ? chunks.map((chunk, i) => (
            <span
              key={i}
              style={{
                whiteSpace: 'nowrap',
                // 句読点（。、！？）で終わるチャンクの右側空白を補正
                // 全角句読点は字形の右半分がほぼ空白のため中央揃えがずれる
                marginRight: CJK_TRAILING_PUNCT.test(chunk) ? '-0.4em' : undefined,
              }}
            >
              {chunk}
            </span>
          ))
        : text
      }
    </Tag>
  );
}
