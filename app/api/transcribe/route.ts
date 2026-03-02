import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audio = formData.get('audio');
    const prompt = formData.get('prompt');
    const language = (formData.get('language') as string | null) || 'en';
    const temperatureRaw = formData.get('temperature');
    const temperature =
      typeof temperatureRaw === 'string' && !Number.isNaN(parseFloat(temperatureRaw))
        ? parseFloat(temperatureRaw)
        : 0;

    if (!audio || !(audio instanceof File)) {
      return NextResponse.json(
        { success: false, error: '音声ファイルがありません' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await audio.arrayBuffer());
    const file = new File([buffer], audio.name || 'audio.webm', {
      type: audio.type || 'audio/webm',
    });

    const promptText = typeof prompt === 'string' && prompt.trim()
      ? prompt.toString().slice(0, 800)
      : undefined;

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language,
      prompt: promptText,
      temperature,
      response_format: 'verbose_json',
    });

    // verbose_json では no_speech_prob が取得可能
    const result = transcription as any;
    const noSpeechProb = result.segments?.[0]?.no_speech_prob ?? 0;

    return NextResponse.json({
      success: true,
      text: noSpeechProb > 0.8 ? '' : (result.text || ''),
      noSpeechProb,
    });
  } catch (error: any) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Transcription failed' },
      { status: 500 }
    );
  }
}
