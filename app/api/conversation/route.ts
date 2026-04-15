import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { checkRateLimit, RATE_LIMITS } from '@/utils/rateLimit';
import { getClientId } from '@/utils/clientId';
import { checkDailyLimit, getPlanFromHeader, dailyLimitHeaders, DAILY_LIMITS } from '@/utils/dailyLimit';
import { Message, ConversationSettings } from '@/types/conversation';

// Capacitorビルド（静的エクスポート）時に必要
export const dynamic = 'force-static';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// システムプロンプトを生成
function createSystemPrompt(settings: ConversationSettings): string {
  const levelDescriptions = {
    beginner: 'Use simple vocabulary and short sentences. Speak slowly and clearly.',
    intermediate: 'Use everyday vocabulary with some idioms. Speak at a moderate pace.',
    advanced: 'Use natural, native-level English with idioms and complex structures.',
  };

  const correctionInstructions = {
    realtime: `Persona: You are a patient, encouraging English tutor. Keep replies under 2 sentences to maintain tempo.

Correction flow:
1. User speaks correctly → Do NOT add a Correction line. Just reply naturally.
2. User speaks with a clear grammar error → Add "Correction:" with the corrected sentence.
3. After you gave a correction:
   a. User retries and says it correctly (or close enough) → Praise them briefly. Do NOT add another Correction line.
   b. User retries but still has a clear error → Add "Correction:" again with the fix.
   c. User ignores the correction and moves on to a new topic → That is fine. Do NOT re-correct the old mistake. Just continue the conversation naturally.

What counts as "a clear grammar error" (only correct these):
- Wrong verb form, missing subject/verb, broken sentence structure
- Meaning is unclear or significantly wrong

Do NOT correct:
- Minor article/preposition mistakes (a/the, in/on/at)
- Word order that is still understandable
- Natural spoken English that differs slightly from textbook grammar

Format: Append a new line starting with "Correction:" followed by the correct sentence only.
If no correction is needed, do NOT include a Correction line. When in doubt, do NOT correct.`,
    summary:
      'Do not correct during conversation. Just respond naturally. Keep replies under 2 sentences.',
    off: 'Do not correct. Just respond naturally. Keep replies under 2 sentences.',
  };

  return `You are a friendly English conversation partner helping a Japanese learner practice casual daily English conversation.

User's English Level: ${settings.userLevel}
- ${levelDescriptions[settings.userLevel]}

Correction Mode: ${settings.correctionMode}
- ${correctionInstructions[settings.correctionMode]}

Guidelines:
1. Always respond in English unless the user specifically asks for Japanese explanations (e.g., "Explain that in Japanese", "日本語で説明して")
2. When asked for Japanese explanation, provide translation and grammar explanation in Japanese
3. Keep conversations casual and natural, like talking to a friend
4. Ask follow-up questions to keep the conversation flowing
5. Be encouraging and supportive
6. If the user seems stuck, suggest a new topic or ask a simple question
${settings.topic ? `7. Try to discuss the topic: ${settings.topic}` : '7. Keep the chat light and friendly.'}

Remember: Your goal is to help them practice speaking English naturally and build confidence!`;
}

// 添削が必要かチェック
function checkForCorrection(
  userMessage: string,
  aiResponse: string,
  correctionMode: string
): { needsCorrection: boolean; correction?: any } {
  // リアルタイム添削モードでない場合はスキップ
  if (correctionMode !== 'realtime') {
    return { needsCorrection: false };
  }

  const match = aiResponse.match(/Correction:\s*(.+)/i);
  if (match) {
    return {
      needsCorrection: true,
      correction: {
        original: userMessage,
        corrected: match[1].trim(),
        explanation: 'Significant grammar correction',
      },
    };
  }

  return { needsCorrection: false };
}

export async function POST(request: NextRequest) {
  try {
    // レートリミットチェック
    const clientId = await getClientId();
    const rateLimitResult = checkRateLimit(clientId, RATE_LIMITS.ASK_AI);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'リクエスト制限に達しました。1分あたり10回までです。',
          resetTime: rateLimitResult.resetTime,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(
              rateLimitResult.resetTime
            ).toISOString(),
          },
        }
      );
    }

    // 日次上限チェック
    const plan = getPlanFromHeader(request.headers.get('x-user-plan'));
    const dailyResult = checkDailyLimit(clientId, plan, DAILY_LIMITS.CONVERSATION);
    if (!dailyResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: '本日の利用上限に達しました。明日またお試しください。',
          dailyLimitReached: true,
          resetTime: dailyResult.resetTime,
        },
        { status: 429, headers: dailyLimitHeaders(dailyResult) }
      );
    }

    const body = await request.json();
    const {
      messages,
      settings,
    }: {
      messages: Message[];
      settings: ConversationSettings;
    } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'メッセージが必要です' },
        { status: 400 }
      );
    }

    // 環境変数チェック
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'API key not configured' },
        { status: 500 }
      );
    }

    // システムプロンプト生成
    const systemPrompt = createSystemPrompt(settings);

    // OpenAI API用のメッセージ形式に変換（correction情報を復元してAIに文脈を渡す）
    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map((msg: any) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.role === 'assistant' && msg.correction
          ? `${msg.content}\nCorrection: ${msg.correction.corrected}`
          : msg.content,
      })),
    ];

    // OpenAI APIコール
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: openaiMessages,
      temperature: 0.8,
      max_tokens: 500,
    });

    const aiResponse = completion.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('AIからの応答が空です');
    }

    // ユーザーの最後のメッセージ
    const lastUserMessage = messages[messages.length - 1]?.content || '';

    // 添削チェック
    const { needsCorrection, correction } = checkForCorrection(
      lastUserMessage,
      aiResponse,
      settings.correctionMode
    );

    // Correction行を応答テキストから除去（添削は別フィールドで返すため）
    const cleanResponse = aiResponse.replace(/\n?Correction:\s*.+/i, '').trim();

    return NextResponse.json(
      {
        success: true,
        response: cleanResponse,
        correction: needsCorrection ? correction : null,
      },
      {
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
        },
      }
    );
  } catch (error) {
    console.error('AI会話エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'AI会話中にエラーが発生しました',
      },
      { status: 500 }
    );
  }
}
