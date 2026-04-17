import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Sentence } from '@/types/sentence';
import { checkRateLimit, RATE_LIMITS } from '@/utils/rateLimit';
import { getClientId } from '@/utils/clientId';
import { previewDailyLimit, consumeDailyLimit, getPlanFromHeader, dailyLimitHeaders, DAILY_LIMITS } from '@/utils/dailyLimit';

// Capacitorビルド（静的エクスポート）時に必要
export const dynamic = 'force-static';

// OpenAI クライアント
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 例文生成プロンプト
function createPrompt(count: number, level?: string, tags?: string[]): string {
  const levelText = level || 'A1～B1（初級～中級）';
  const tagsText = tags && tags.length > 0 ? tags.join('、') : '日常会話、仕事、旅行';

  const timestamp = Date.now();
  const randomSeed = Math.random().toString(36).substring(7);

  return `あなたは英語学習アプリの例文作成者です。以下の条件で日本語と英語のペアを${count}個生成してください。

【重要】
- 毎回まったく異なる新しい例文を生成してください
- 前回と同じ内容や似た表現は避けてください
- バリエーション豊かな表現を心がけてください
- リクエストID: ${timestamp}-${randomSeed}

【条件】
- レベル: ${levelText}
- カテゴリー: ${tagsText}
- 実用的で自然な会話表現
- 固有名詞は避ける（一般的な表現を使用）
- 不自然な英語や危険な表現は避ける
- 各例文は独立した内容にする

【出力形式】
必ず以下のJSON形式で出力してください。他のテキストは一切含めないでください。

{
  "sentences": [
    {
      "jp": "日本語の文章",
      "en": "English sentence",
      "tags": ["タグ1", "タグ2"],
      "level": "A1"
    }
  ]
}

レベルは A1, A2, B1, B2 のいずれかを使用してください。
タグは「日常会話」「仕事」「旅行」「買い物」「食事」「趣味」などから適切に選んでください。`;
}

// JSON検証関数
function validateSentences(data: unknown): Sentence[] {
  if (!Array.isArray(data)) {
    throw new Error('データは配列である必要があります');
  }

  return data.map((item, index) => {
    if (
      typeof item !== 'object' ||
      !item ||
      typeof item.jp !== 'string' ||
      typeof item.en !== 'string' ||
      !Array.isArray(item.tags) ||
      typeof item.level !== 'string'
    ) {
      throw new Error(`${index + 1}番目のデータが不正です`);
    }

    const validLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    if (!validLevels.includes(item.level)) {
      throw new Error(`${index + 1}番目のレベルが不正です: ${item.level}`);
    }

    return {
      id: crypto.randomUUID(),
      jp: item.jp,
      en: item.en,
      tags: item.tags,
      level: item.level as Sentence['level'],
      nextDue: Date.now(),
      correctCount: 0,
      incorrectCount: 0,
    };
  });
}

export async function POST(request: NextRequest) {
  try {
    // レートリミットチェック
    const clientId = await getClientId();
    const rateLimitResult = checkRateLimit(
      clientId,
      RATE_LIMITS.GENERATE_SENTENCES
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'リクエスト制限に達しました。1時間あたり20回までです。',
          resetTime: rateLimitResult.resetTime,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
          },
        }
      );
    }

    // 日次上限チェック
    const plan = getPlanFromHeader(request.headers.get('x-user-plan'));
    const dailyResult = previewDailyLimit(clientId, plan, DAILY_LIMITS.GENERATE_SENTENCES);
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

    // リクエストボディ取得
    const body = await request.json();
    const { count = 5, level, tags } = body;

    // 環境変数チェック
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'API key not configured' },
        { status: 500 }
      );
    }

    // プロンプト作成
    const prompt = createPrompt(count, level, tags);

    // OpenAI API呼び出し（最大3回リトライ）
    let sentences: Sentence[] = [];
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'あなたは英語学習用の例文を生成するアシスタントです。必ずJSON形式で応答してください。毎回異なる多様な例文を生成することが重要です。',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 1.0, // より多様な出力のために温度を上げる
          response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
          throw new Error('AIからの応答が空です');
        }

        // JSON パース
        const parsed = JSON.parse(content);

        // データが配列でない場合、sentencesキーを探す
        let dataArray;
        if (Array.isArray(parsed)) {
          dataArray = parsed;
        } else if (parsed.sentences && Array.isArray(parsed.sentences)) {
          dataArray = parsed.sentences;
        } else if (parsed.data && Array.isArray(parsed.data)) {
          dataArray = parsed.data;
        } else {
          console.error('予期しないJSON形式:', parsed);
          throw new Error('JSONの形式が正しくありません');
        }

        sentences = validateSentences(dataArray);

        // 成功したらループを抜ける
        if (sentences.length > 0) {
          break;
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('不明なエラー');
        console.error(`生成試行 ${attempt} 失敗:`, lastError.message);

        // 最後の試行でない場合は少し待つ
        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }

    // 全試行失敗
    if (sentences.length === 0) {
      throw lastError || new Error('例文生成に失敗しました');
    }

    const consumedDailyResult = consumeDailyLimit(clientId, plan, DAILY_LIMITS.GENERATE_SENTENCES);

    return NextResponse.json(
      {
        success: true,
        sentences,
      },
      {
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
          ...dailyLimitHeaders(consumedDailyResult),
        },
      }
    );
  } catch (error) {
    console.error('Generate sentences error:', error);
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
