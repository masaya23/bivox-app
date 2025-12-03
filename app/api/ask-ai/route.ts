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
          content: `あなたは英語学習のサポートをするAIアシスタントです。
学習者からの質問に対して、わかりやすく丁寧に日本語で回答してください。
文法、表現、ニュアンス、使い方などについて具体的に説明してください。
必要に応じて例文を追加してください。

${sentencesContext ? `ユーザーが練習した文章:\n${sentencesContext}\n\n上記の文章を参考にしながら質問に答えてください。` : ''}`,
        },
        {
          role: 'user',
          content: question,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
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
