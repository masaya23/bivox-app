import { USAGE_LIMITS } from '@/contexts/UsageLimitContext';

// 会話メッセージの型
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// AI APIに送信する際の履歴を圧縮する
// 直近のMAX_CONVERSATION_HISTORY件（デフォルト20メッセージ = 10往復）のみを保持
export function compressConversationHistory(
  messages: ConversationMessage[],
  maxMessages: number = USAGE_LIMITS.MAX_CONVERSATION_HISTORY
): ConversationMessage[] {
  // システムメッセージを分離
  const systemMessages = messages.filter(m => m.role === 'system');
  const conversationMessages = messages.filter(m => m.role !== 'system');

  // 会話メッセージが上限を超えている場合は、直近のメッセージのみを保持
  if (conversationMessages.length > maxMessages) {
    const trimmedMessages = conversationMessages.slice(-maxMessages);
    // システムメッセージを先頭に追加して返す
    return [...systemMessages, ...trimmedMessages];
  }

  // 上限以下の場合はそのまま返す
  return messages;
}

// 会話ターン数をカウント（1往復 = 1ターン）
export function countConversationTurns(messages: ConversationMessage[]): number {
  const conversationMessages = messages.filter(m => m.role !== 'system');
  // ユーザーとアシスタントのペアをカウント
  const userMessages = conversationMessages.filter(m => m.role === 'user').length;
  return userMessages;
}

// AI応用ドリル用の履歴圧縮
// 問題と解答のコンテキストを保持しつつ、古い問題は要約する
export function compressAIDrillHistory(
  messages: ConversationMessage[],
  maxMessages: number = USAGE_LIMITS.MAX_CONVERSATION_HISTORY
): ConversationMessage[] {
  const systemMessages = messages.filter(m => m.role === 'system');
  const conversationMessages = messages.filter(m => m.role !== 'system');

  if (conversationMessages.length <= maxMessages) {
    return messages;
  }

  // 直近のメッセージを保持
  const recentMessages = conversationMessages.slice(-maxMessages);

  // 古いメッセージの要約を作成（オプション）
  const oldMessages = conversationMessages.slice(0, -maxMessages);
  const summaryContent = createDrillSummary(oldMessages);

  // 要約メッセージを追加
  const summaryMessage: ConversationMessage = {
    role: 'system',
    content: `[過去の学習履歴の要約]\n${summaryContent}`,
  };

  return [...systemMessages, summaryMessage, ...recentMessages];
}

// ドリル履歴の要約を作成
function createDrillSummary(messages: ConversationMessage[]): string {
  // 問題数と正解数を概算
  const userMessages = messages.filter(m => m.role === 'user');
  const totalQuestions = userMessages.length;

  // 簡易的な要約
  return `これまでに${totalQuestions}問の練習を行いました。`;
}

// 会話をストレージに保存/読み込みするためのユーティリティ
const CONVERSATION_STORAGE_KEY = 'englishapp_conversation_';

export function saveConversation(sessionId: string, messages: ConversationMessage[]): void {
  try {
    const compressed = compressConversationHistory(messages);
    localStorage.setItem(
      CONVERSATION_STORAGE_KEY + sessionId,
      JSON.stringify(compressed)
    );
  } catch {
    // ストレージ容量オーバーなどの場合は古いデータを削除
    console.warn('Failed to save conversation history');
  }
}

export function loadConversation(sessionId: string): ConversationMessage[] {
  try {
    const stored = localStorage.getItem(CONVERSATION_STORAGE_KEY + sessionId);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    console.warn('Failed to load conversation history');
  }
  return [];
}

export function clearConversation(sessionId: string): void {
  localStorage.removeItem(CONVERSATION_STORAGE_KEY + sessionId);
}

// 全ての会話セッションをクリア
export function clearAllConversations(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CONVERSATION_STORAGE_KEY)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
}
