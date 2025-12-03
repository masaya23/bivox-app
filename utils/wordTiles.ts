/**
 * 英文を単語に分割してシャッフルする
 */
export function shuffleWords(sentence: string): string[] {
  // 文を単語と句読点に分割
  const words = sentence.match(/[\w']+|[.,!?;]/g) || [];

  // Fisher-Yatesアルゴリズムでシャッフル
  const shuffled = [...words];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

/**
 * 選択された単語を文に結合
 */
export function joinWords(words: string[]): string {
  return words
    .map((word, index) => {
      // 句読点の前にスペースを入れない
      if (/[.,!?;]/.test(word)) {
        return word;
      }
      // 最初の単語の前にはスペースを入れない
      if (index === 0) {
        return word;
      }
      return ' ' + word;
    })
    .join('');
}

/**
 * 2つの文が同じかチェック（大文字小文字、スペースを無視）
 */
export function compareSentences(answer: string, correct: string): boolean {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

  return normalize(answer) === normalize(correct);
}
