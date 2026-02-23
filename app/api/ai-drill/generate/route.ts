import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { checkRateLimit, RATE_LIMITS } from '@/utils/rateLimit';
import { getClientId } from '@/utils/clientId';

const NAME_CANDIDATES = [
  'Ken',
  'Yumi',
  'Kenta',
  'Sakura',
  'Mr. Tanaka',
  'Ms. Sato',
  'Taro',
  'Hanako',
  'Mika',
  'Hiroshi',
  'My father',
  'My sister',
];

const getRandomNames = (count: number) => {
  const shuffled = [...NAME_CANDIDATES].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count).join(', ');
};

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
          error: 'リクエスト制限に達しました。しばらくお待ちください。',
          resetTime: rateLimitResult.resetTime,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const partTitle = body.part_title || body.partTitle || '';
    const samples = body.samples || body.sampleSentences || [];
    const grammarTags = body.grammarTags || [];
    const excludeQuestions = body.excludeQuestions || [];

    if (!samples || samples.length === 0) {
      return NextResponse.json(
        { success: false, error: 'サンプル文が必要です' },
        { status: 400 }
      );
    }

    // サンプル文をフォーマット
    const samplesText = samples
      .map((s: { jp: string; en: string }, i: number) => `例${i + 1}: ${s.jp} → ${s.en}`)
      .join('\n');

    const grammarContext = grammarTags.length > 0
      ? `対象文法: ${grammarTags.join(', ')}`
      : '';

    const excludeContext = excludeQuestions && excludeQuestions.length > 0
      ? `\n\n絶対に以下の問題と同じ内容・意味の問題は作成しないでください（既に出題済み）:\n${excludeQuestions.slice(0, 10).map((q: string) => `- ${q}`).join('\n')}`
      : '';

    const selectedNames = getRandomNames(4);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert English teacher creating a practice drill.

# Task
Create **10 unique practice questions** (Japanese to English translation) based on the grammar topic: "${partTitle}".
Output must be a JSON object with a key "questions" containing an array of 10 objects.

# Balance & Diversity Rules (CRITICAL)
1. Sentence Type Balance:
   - Analyze the "${partTitle}".
   - IF the grammar allows different types (e.g., "be verb", "past tense", "can"), you MUST generate a mix:
     - Affirmative (+): 3-4 questions
     - Negative (-): 3-4 questions
     - Interrogative (?): 3-4 questions
   - IF the grammar is specific (e.g., "Where", "What", "How many"), force that sentence type but vary the rest.

2. Subject Diversity:
   - Do NOT use "You" or "I" for more than 2 questions each.
   - You MUST use a mix of pronouns: "He", "She", "We", "They", "It".
   - You MUST use specific names/nouns for at least 3 questions. Use these names: [${selectedNames}].

3. No Duplication:
   - Do not repeat the same verb or adjective more than twice.
   - Ensure every Japanese sentence is distinct.

${grammarContext}${excludeContext}

# Sample Style (Follow this difficulty level)
${samplesText}

# Output Format (JSON Only)
{
  "questions": [
    { "japanese": "...", "english": "..." },
    ...
  ]
}`,
        },
        {
          role: 'user',
          content: 'Generate 10 questions now.',
        },
      ],
      temperature: 0.7,
      max_tokens: 900,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error('AIからの応答が空です');
    }

    // JSONをパース
    let result: { questions?: { japanese: string; english: string }[] } | { japanese: string; english: string }[];
    try {
      result = JSON.parse(content);
    } catch {
      console.error('JSON parse error:', content);
      throw new Error('AIの応答をパースできませんでした');
    }

    return NextResponse.json({
      success: true,
      questions: Array.isArray(result) ? result : result.questions,
    });
  } catch (error) {
    console.error('AI問題生成エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'AI問題生成中にエラーが発生しました',
      },
      { status: 500 }
    );
  }
}
