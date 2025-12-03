/**
 * SRS (Spaced Repetition System) - 間隔反復システム
 */

export interface SRSCard {
  sentenceId: string;
  interval: number; // 次の復習までの日数
  repetitions: number; // 復習回数
  easeFactor: number; // 難易度係数 (1.3〜2.5)
  nextReviewDate: string; // 次の復習日
  lastReviewDate: string; // 最後の復習日
}

/**
 * SM-2アルゴリズムに基づく次の復習間隔を計算
 */
function calculateNextInterval(
  quality: number, // 0-5 (0: 完全に忘れた, 5: 完璧)
  repetitions: number,
  interval: number,
  easeFactor: number
): { interval: number; easeFactor: number; repetitions: number } {
  let newEaseFactor = easeFactor;
  let newRepetitions = repetitions;
  let newInterval = interval;

  if (quality < 3) {
    // 失敗した場合
    newRepetitions = 0;
    newInterval = 1;
  } else {
    // 成功した場合
    newEaseFactor = Math.max(
      1.3,
      newEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    );

    if (newRepetitions === 0) {
      newInterval = 1;
    } else if (newRepetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * newEaseFactor);
    }

    newRepetitions += 1;
  }

  return {
    interval: newInterval,
    easeFactor: newEaseFactor,
    repetitions: newRepetitions,
  };
}

/**
 * 評価から品質スコアに変換
 */
function ratingToQuality(rating: 'perfect' | 'okay' | 'failed'): number {
  switch (rating) {
    case 'perfect':
      return 5;
    case 'okay':
      return 3;
    case 'failed':
      return 0;
    default:
      return 0;
  }
}

/**
 * SRSカードを取得
 */
export function getSRSCard(sentenceId: string): SRSCard | null {
  try {
    const stored = localStorage.getItem(`srs_${sentenceId}`);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * 全SRSカードを取得
 */
export function getAllSRSCards(): SRSCard[] {
  const cards: SRSCard[] = [];

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('srs_')) {
        const card = localStorage.getItem(key);
        if (card) {
          cards.push(JSON.parse(card));
        }
      }
    }
  } catch {
    return [];
  }

  return cards;
}

/**
 * 復習が必要なカードを取得
 */
export function getDueCards(): SRSCard[] {
  const allCards = getAllSRSCards();
  const today = new Date();

  return allCards.filter((card) => {
    const nextReview = new Date(card.nextReviewDate);
    return nextReview <= today;
  });
}

/**
 * SRSカードを更新
 */
export function updateSRSCard(
  sentenceId: string,
  rating: 'perfect' | 'okay' | 'failed'
): SRSCard {
  const existingCard = getSRSCard(sentenceId);
  const quality = ratingToQuality(rating);
  const now = new Date();

  if (!existingCard) {
    // 新規カード
    const { interval, easeFactor, repetitions } = calculateNextInterval(
      quality,
      0,
      0,
      2.5
    );

    const nextReviewDate = new Date(now);
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);

    const newCard: SRSCard = {
      sentenceId,
      interval,
      repetitions,
      easeFactor,
      nextReviewDate: nextReviewDate.toISOString(),
      lastReviewDate: now.toISOString(),
    };

    localStorage.setItem(`srs_${sentenceId}`, JSON.stringify(newCard));
    return newCard;
  }

  // 既存カードの更新
  const { interval, easeFactor, repetitions } = calculateNextInterval(
    quality,
    existingCard.repetitions,
    existingCard.interval,
    existingCard.easeFactor
  );

  const nextReviewDate = new Date(now);
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);

  const updatedCard: SRSCard = {
    ...existingCard,
    interval,
    repetitions,
    easeFactor,
    nextReviewDate: nextReviewDate.toISOString(),
    lastReviewDate: now.toISOString(),
  };

  localStorage.setItem(`srs_${sentenceId}`, JSON.stringify(updatedCard));
  return updatedCard;
}
