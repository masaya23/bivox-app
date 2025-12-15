import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const explanationSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    alsoAcceptable: {
      type: 'array',
      items: { type: 'string' },
      minItems: 1,
      maxItems: 3,
    },
    ruleJa: {
      type: 'string',
      minLength: 1,
    },
    nuanceJa: {
      type: 'string',
      minLength: 1,
    },
  },
  required: ['alsoAcceptable', 'ruleJa', 'nuanceJa'],
};

const systemPrompt = `You are a professional Japanese tutor for English learners (A1–B1).
Given a Japanese sentence and its correct English translation, explain WHY this is the correct answer in Japanese.

OUTPUT JSON SCHEMA (MUST MATCH):
{
  "alsoAcceptable": [string, ...] (2-3 alternative correct translations, max 3),
  "ruleJa": string (grammar rule explanation in Japanese),
  "nuanceJa": string (meaning and nuance explanation in Japanese)
}

QUALITY TEMPLATE (MUST FOLLOW EXACTLY):

Visual writing style rules (quote usage is STRICT):
- Japanese sentence: quote with 『...』
- English word/phrase/sentence: quote with "..."
- Grammar terms: quote with 『三人称単数』『現在形』『現在進行形』『前置詞』『冠詞』『語法』『疑問文』 etc.
- Use connectors: しかし / また / そのため / したがって / この場合 / そして

A) alsoAcceptable (2-3 alternative correct translations)
- Include the main correct answer as [0]
- Provide 1-2 alternative ways to express the same meaning
- Each must be a complete, grammatically correct sentence
- Examples: "I am a student.", "I'm a student.", "I am a student"

B) ruleJa (2-3 sentences, MUST include ×/○ examples and grammar label)
- MUST include one grammar label word from:
  『疑問文』『現在形』『現在進行形』『三人称単数(-s)』『前置詞』『冠詞(a/the)』『語法』『be動詞』
- MUST include example lines:
  ×"..."
  ○"..."
- Explain WHY this grammar rule is used
- Use simple Japanese + connectors like 「しかし」「また」「そのため」「したがって」

C) nuanceJa (2-3 sentences, MUST include meaning + usage)
- MUST include: 『{correctAnswer}』は「...」という意味です。
- Explain when and how this expression is used
- Describe any cultural or contextual nuances
- End with: これにより、意味が明確で自然な英語になります。

Return ONLY JSON matching the schema (no markdown, no extra text).`;

export async function POST(request: NextRequest) {
  try {
    const { jp, correctAnswer, level = 'A1', tags = [] } = await request.json();

    if (!jp || !correctAnswer) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: jp, correctAnswer' },
        { status: 400 }
      );
    }

    const userPrompt = `Japanese sentence: ${jp}
Correct English translation: ${correctAnswer}
Level: ${level}
Tags: ${tags.join(', ')}

Explain in Japanese WHY this is the correct translation, following the template exactly.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-2024-08-06',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'grammar_explanation',
          strict: true,
          schema: explanationSchema,
        },
      },
    });

    const responseText = completion.choices[0].message.content;
    if (!responseText) {
      throw new Error('AI returned empty response');
    }

    const explanation = JSON.parse(responseText);

    return NextResponse.json({
      success: true,
      explanation,
    });
  } catch (error: any) {
    console.error('Grammar explanation error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Explanation generation failed' },
      { status: 500 }
    );
  }
}
