import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { checkRateLimit, RATE_LIMITS } from '@/utils/rateLimit';
import { getClientId } from '@/utils/clientId';
import { checkDailyLimit, getPlanFromHeader, dailyLimitHeaders, DAILY_LIMITS } from '@/utils/dailyLimit';

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

/**
 * ストリーミングバッファからJSONオブジェクトを抽出
 * { "japanese": "...", "english": "..." } を検出して返す
 */
function extractQuestions(buffer: string, startFrom: number): { found: { japanese: string; english: string }[]; lastEnd: number } {
  const found: { japanese: string; english: string }[] = [];
  let pos = startFrom;

  while (pos < buffer.length) {
    const objStart = buffer.indexOf('{', pos);
    if (objStart === -1) break;

    // 対応する閉じブレースを探す（文字列内のブレースを無視）
    let depth = 0;
    let inString = false;
    let escaped = false;
    let i = objStart;

    for (; i < buffer.length; i++) {
      const ch = buffer[i];
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') depth++;
      if (ch === '}') { depth--; if (depth === 0) break; }
    }

    if (depth !== 0) break; // 未完了オブジェクト

    const objStr = buffer.substring(objStart, i + 1);
    try {
      const obj = JSON.parse(objStr);
      if (obj.japanese && obj.english) {
        found.push({ japanese: obj.japanese, english: obj.english });
        pos = i + 1;
      } else {
        pos = objStart + 1;
      }
    } catch {
      pos = objStart + 1;
    }
  }

  return { found, lastEnd: pos };
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
          error: 'リクエスト制限に達しました。しばらくお待ちください。',
          resetTime: rateLimitResult.resetTime,
        },
        { status: 429 }
      );
    }

    // 日次上限チェック
    const plan = getPlanFromHeader(request.headers.get('x-user-plan'));
    const dailyResult = checkDailyLimit(clientId, plan, DAILY_LIMITS.AI_DRILL_GENERATE);
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
      .map((s: { jp: string; en: string }, i: number) => `${s.en} → ${s.jp}`)
      .join('\n');

    const grammarContext = grammarTags.length > 0
      ? `Grammar tags: ${grammarTags.join(', ')}`
      : '';

    const excludeContext = excludeQuestions && excludeQuestions.length > 0
      ? `\nDo NOT generate questions with the same meaning as these (already used):\n${excludeQuestions.slice(0, 10).map((q: string) => `- ${q}`).join('\n')}`
      : '';

    const selectedNames = getRandomNames(4);

    // ストリーミングでOpenAI APIを呼び出し
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      stream: true,
      messages: [
        {
          role: 'system',
          content: `You create English practice drills. Grammar topic: "${partTitle}".

# CRITICAL WORKFLOW: English-First Generation
Do NOT translate Japanese into English. You must reverse your thinking process:
1. First, CREATE a completely natural, everyday English sentence that fits the "${partTitle}" grammar pattern — something a native speaker would actually say in real life (at a cafe, at work, talking to friends).
2. THEN, write a natural Japanese translation for it.

# Naturalness Rules
- Absolutely NO "translationese". Avoid textbook-style stiff sentences, robotic phrasing, and literal word-for-word matching.
- Ensure all parts of speech (verbs, prepositions, adjectives, pronouns) are used in their most natural, native-level collocations. If the English sounds even slightly unnatural, throw it away and create a new one.
- When writing the Japanese translation, make it sound like natural, everyday conversational Japanese. Do not force the Japanese to match the English structure exactly.

# Structure Rules
- 10 questions: mix affirmative/negative/interrogative (3-4 each if grammar allows)
- Vary subjects: He, She, We, They, It + names: [${selectedNames}]. Max 2 uses of "I"/"You".
- No repeated verbs/adjectives more than twice.
- English must match the "${partTitle}" pattern exactly. No advanced grammar.
${grammarContext}${excludeContext}

# Samples (follow this level)
${samplesText}

# Output: JSON only
{"questions":[{"japanese":"...","english":"..."},...]}`
        },
        {
          role: 'user',
          content: 'Generate 10 questions.',
        },
      ],
      temperature: 0.7,
      max_tokens: 1200,
    });

    // NDJSONストリームとして返す（1問ごとに1行）
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          let buffer = '';
          let lastEnd = 0;

          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            buffer += content;

            // バッファから完成した問題オブジェクトを抽出
            const result = extractQuestions(buffer, lastEnd);
            for (const q of result.found) {
              controller.enqueue(encoder.encode(JSON.stringify(q) + '\n'));
            }
            lastEnd = result.lastEnd;
          }

          // ストリーム終了後、残りの問題を抽出
          const finalResult = extractQuestions(buffer, lastEnd);
          for (const q of finalResult.found) {
            controller.enqueue(encoder.encode(JSON.stringify(q) + '\n'));
          }

          controller.close();
        } catch (error) {
          console.error('ストリーミング問題生成エラー:', error);
          controller.enqueue(encoder.encode(JSON.stringify({ error: 'AI問題生成中にエラーが発生しました' }) + '\n'));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
      },
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
