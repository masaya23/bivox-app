import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Capacitorビルド（静的エクスポート）時に必要
export const dynamic = 'force-static';

export async function GET() {
  try {
    // 環境変数の確認
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY が設定されていません' },
        { status: 500 }
      );
    }

    // OpenAI クライアント初期化
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // 簡単なテスト生成
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: 'こんにちは！1文で自己紹介してください。',
        },
      ],
      max_tokens: 100,
    });

    const aiResponse = completion.choices[0]?.message?.content || '応答なし';

    return NextResponse.json({
      success: true,
      message: 'OpenAI API接続成功！',
      aiResponse,
      model: completion.model,
    });
  } catch (error: unknown) {
    console.error('OpenAI API Error:', error);
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    return NextResponse.json(
      { error: 'API呼び出しエラー', details: errorMessage },
      { status: 500 }
    );
  }
}
