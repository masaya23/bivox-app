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

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language,
      prompt: typeof prompt === 'string' && prompt.trim() ? prompt.toString().slice(0, 500) : undefined,
      temperature,
    });

    return NextResponse.json({
      success: true,
      text: transcription.text,
    });
  } catch (error: any) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Transcription failed' },
      { status: 500 }
    );
  }
}
