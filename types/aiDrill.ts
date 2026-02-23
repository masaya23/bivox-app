// AI応用ドリルモードの型定義

export interface AIDrillQuestion {
  id: string;
  questionJa: string;
  correctEn: string;
  userAnswerEn: string;
  isCorrect: boolean | null; // null = 未回答
  explanation: string;
}

export interface AIDrillSession {
  totalQuestions: number;
  currentIndex: number;
  history: AIDrillQuestion[];
  partId: string;
  partTitle: string;
  grammarTags: string[];
}

export interface GenerateQuestionRequest {
  partId: string;
  sampleSentences: { jp: string; en: string }[];
  grammarTags: string[];
}

export interface GenerateQuestionResponse {
  questionJa: string;
  expectedEn: string;
}

export interface JudgeAnswerRequest {
  questionJa: string;
  expectedEn: string;
  userAnswerEn: string;
  grammarTags: string[];
}

export interface JudgeAnswerResponse {
  isCorrect: boolean;
  correctEn: string;
  explanation: string;
}

export type AIDrillPhase = 'loading' | 'question' | 'recording' | 'judging' | 'result' | 'finished';
