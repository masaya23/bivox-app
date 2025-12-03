/**
 * AI英会話機能の型定義
 */

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  // 音声認識されたユーザーの発話
  transcription?: string;
  // AIによる添削（文法ミスがある場合）
  correction?: {
    original: string;
    corrected: string;
    explanation: string;
  };
}

export interface ConversationSettings {
  // ユーザーの英語レベル
  userLevel: 'beginner' | 'intermediate' | 'advanced';
  // 添削モード
  correctionMode: 'realtime' | 'summary' | 'off';
  // 会話のトピック（オプション）
  topic?: string;
}

export interface ConversationSession {
  id: string;
  messages: Message[];
  settings: ConversationSettings;
  startTime: number;
  endTime?: number;
}

export interface ConversationSummary {
  totalMessages: number;
  userMessagesCount: number;
  corrections: Array<{
    original: string;
    corrected: string;
    explanation: string;
  }>;
  suggestedTopics: string[];
}
