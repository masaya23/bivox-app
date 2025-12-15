import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { checkRateLimit, RATE_LIMITS } from '@/utils/rateLimit';
import { getClientId } from '@/utils/clientId';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
          },
        }
      );
    }

    const { question, sentences } = await request.json();

    if (!question) {
      return NextResponse.json(
        { success: false, error: '質問内容が必要です' },
        { status: 400 }
      );
    }

    // 練習した文章を文脈として含める
    let sentencesContext = '';
    if (sentences && Array.isArray(sentences) && sentences.length > 0) {
      sentencesContext = sentences
        .map((s: any, i: number) => `${i + 1}. ${s.jp} → ${s.en}`)
        .join('\n');
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `あなたは忍耐強く、励まし上手な英語学習コーチです。
日本人学習者の質問に、わかりやすく丁寧に日本語で回答してください。

回答の方針:
1. **具体的な説明**: 文法、表現、ニュアンスを詳しく解説
2. **例文を豊富に**: 理解を深めるため複数の例を提示
3. **文脈の提供**: いつ、どのような場面で使うかを明確に
4. **比較と対比**: 似た表現との違いを説明
5. **実践的なアドバイス**: すぐに使える学習のヒント
6. **励まし**: 学習者のモチベーションを高める言葉を添える

回答構成:
- メインの説明（2-3段落）
- 例文（2-3個）
- 実践的なアドバイス（1段落）
- 励ましの言葉（1文）

${sentencesContext ? `\nユーザーが練習した文章:\n${sentencesContext}\n\n上記の練習内容を踏まえて、質問に答えてください。` : ''}`,
        },
        {
          role: 'user',
          content: question,
        },
      ],
      temperature: 0.7,
      max_tokens: 1200,
    });

    const answer = completion.choices[0]?.message?.content;

    if (!answer) {
      throw new Error('AIからの応答が空です');
    }

    return NextResponse.json(
      {
        success: true,
        answer,
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
    console.error('AI質問エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'AIへの質問中にエラーが発生しました',
      },
      { status: 500 }
    );
  }
}
