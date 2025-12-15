// 文字列を正規化（小文字化、句読点削除）
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?;:'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// レーベンシュタイン距離を計算
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // 削除
        matrix[i][j - 1] + 1, // 挿入
        matrix[i - 1][j - 1] + cost // 置換
      );
    }
  }

  return matrix[len1][len2];
}

// 類似度を計算（0-100%）単語の順序も考慮
export function calculateSimilarity(text1: string, text2: string): number {
  const normalized1 = normalizeText(text1);
  const normalized2 = normalizeText(text2);

  // 完全一致の場合
  if (normalized1 === normalized2) return 100;

  // 単語に分割
  const words1 = normalized1.split(/\s+/).filter(w => w);
  const words2 = normalized2.split(/\s+/).filter(w => w);

  // 単語が完全に一致しているかチェック
  if (words1.length === words2.length) {
    const allMatch = words1.every((word, idx) => word === words2[idx]);
    if (allMatch) return 100;
  }

  // 単語レベルでの類似度計算
  const maxWords = Math.max(words1.length, words2.length);
  let matchCount = 0;
  let positionMatchCount = 0;

  for (let i = 0; i < maxWords; i++) {
    if (words1[i] && words2[i] && words1[i] === words2[i]) {
      matchCount++;
      positionMatchCount++;
    } else if (words1[i] && words2.includes(words1[i])) {
      matchCount += 0.5; // 順序が違う場合は半分のスコア
    }
  }

  // 順序を重視した類似度計算
  const positionScore = (positionMatchCount / maxWords) * 60; // 順序一致は60%
  const contentScore = (matchCount / maxWords) * 40; // 内容一致は40%

  return Math.round(positionScore + contentScore);
}

// 正誤判定（類似度に基づいて判定）
export function judgeAnswer(
  userAnswer: string,
  correctAnswer: string
): {
  isCorrect: boolean;
  similarity: number;
  rating: 'perfect' | 'good' | 'close' | 'wrong';
} {
  const similarity = calculateSimilarity(userAnswer, correctAnswer);

  let rating: 'perfect' | 'good' | 'close' | 'wrong';
  let isCorrect: boolean;

  if (similarity >= 95) {
    rating = 'perfect';
    isCorrect = true;
  } else if (similarity >= 80) {
    rating = 'good';
    isCorrect = true;
  } else if (similarity >= 60) {
    rating = 'close';
    isCorrect = false;
  } else {
    rating = 'wrong';
    isCorrect = false;
  }

  return { isCorrect, similarity, rating };
}
