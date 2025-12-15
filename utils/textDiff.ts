/**
 * 2つのテキストの差分を計算して、視覚的に表示するためのデータを返す
 */

export interface DiffPart {
  text: string;
  type: 'correct' | 'wrong' | 'missing';
}

export function calculateTextDiff(userText: string, correctText: string): {
  hasDiff: boolean;
  parts: DiffPart[];
  correctParts: DiffPart[];
} {
  // 元の単語を保持しつつ、小文字化した単語で判定する
  const normalizeWord = (w: string) => w.toLowerCase().replace(/[^\w']/g, '');
  const userWordsRaw = userText.split(/\s+/).filter(w => w);
  const correctWordsRaw = correctText.split(/\s+/).filter(w => w);
  const userWords = userWordsRaw.map(normalizeWord);
  const correctWords = correctWordsRaw.map(normalizeWord);

  // 完全一致の場合
  if (userText.toLowerCase().trim() === correctText.toLowerCase().trim()) {
    return {
      hasDiff: false,
      parts: [{ text: correctText, type: 'correct' }],
      correctParts: [{ text: correctText, type: 'correct' }],
    };
  }

  const parts: DiffPart[] = [];
  const correctParts: DiffPart[] = [];

  const maxLen = Math.max(userWords.length, correctWords.length);

  for (let i = 0; i < maxLen; i++) {
    const userWord = userWords[i];
    const correctWord = correctWords[i];
    const userRaw = userWordsRaw[i];
    const correctRaw = correctWordsRaw[i];

    if (userWord === correctWord) {
      // 一致
      parts.push({ text: userRaw, type: 'correct' });
      correctParts.push({ text: correctRaw, type: 'correct' });
    } else if (userWord && !correctWord) {
      // ユーザーが余分な単語を追加
      parts.push({ text: userRaw, type: 'wrong' });
    } else if (!userWord && correctWord) {
      // ユーザーが単語を欠落
      parts.push({ text: '', type: 'missing' });
      correctParts.push({ text: correctRaw, type: 'missing' });
    } else {
      // 単語が異なる
      parts.push({ text: userRaw, type: 'wrong' });
      correctParts.push({ text: correctRaw, type: 'missing' });
    }
  }

  return {
    hasDiff: true,
    parts,
    correctParts,
  };
}
