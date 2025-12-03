import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { checkRateLimit, RATE_LIMITS } from '@/utils/rateLimit';
import { getClientId } from '@/utils/clientId';
import { Message, ConversationSettings } from '@/types/conversation';

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
    realtime: `If the user makes a grammar mistake, gently correct it in your response by naturally using the correct form. For example: "Oh, you mean 'I went to the store'? That's great!"`,
    summary: 'Do not correct mistakes during conversation. Just respond naturally.',
    off: 'Do not correct mistakes. Just respond naturally.',
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
${settings.topic ? `\n7. Try to discuss the topic: ${settings.topic}` : ''}

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

  // TODO: より高度な文法チェックを実装
  // 現時点ではAIの応答から添削を検出
  const correctionPatterns = [
    /you mean ['"](.+?)['"]?/i,
    /it should be ['"](.+?)['"]?/i,
    /the correct way is ['"](.+?)['"]?/i,
  ];

  for (const pattern of correctionPatterns) {
    const match = aiResponse.match(pattern);
    if (match) {
      return {
        needsCorrection: true,
        correction: {
          original: userMessage,
          corrected: match[1],
          explanation: 'Grammar correction detected in AI response',
        },
      };
    }
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

    // OpenAI API用のメッセージ形式に変換
    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
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

    return NextResponse.json(
      {
        success: true,
        response: aiResponse,
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
