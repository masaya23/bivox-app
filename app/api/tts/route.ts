import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { checkRateLimit, RATE_LIMITS } from '@/utils/rateLimit';
import { getClientId } from '@/utils/clientId';
import { previewDailyLimit, consumeDailyLimit, getPlanFromHeader, dailyLimitHeaders, DAILY_LIMITS } from '@/utils/dailyLimit';

// Capacitorビルド（静的エクスポート）時に必要
export const dynamic = 'force-static';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // レートリミットチェック
    const clientId = await getClientId();
    const rateLimitResult = checkRateLimit(clientId, RATE_LIMITS.TTS);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'リクエスト制限に達しました。しばらく待ってから再度お試しください。',
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
    const dailyResult = previewDailyLimit(clientId, plan, DAILY_LIMITS.TTS);
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

    const { text, lang } = await request.json();

    if (!text) {
      return NextResponse.json(
        { success: false, error: 'テキストが必要です' },
        { status: 400 }
      );
    }

    // OpenAI TTS APIで音声生成（より自然な最新モデルを使用）
    const mp3 = await openai.audio.speech.create({
      model: 'gpt-4o-mini-tts',
      voice: lang === 'ja' ? 'alloy' : 'alloy',
      input: text,
      speed: 1.0,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    const consumedDailyResult = consumeDailyLimit(clientId, plan, DAILY_LIMITS.TTS);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
        ...dailyLimitHeaders(consumedDailyResult),
      },
    });
  } catch (error) {
    console.error('TTS生成エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'TTS生成中にエラーが発生しました',
      },
      { status: 500 }
    );
  }
}
