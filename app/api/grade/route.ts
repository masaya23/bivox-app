import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// IMPORTANT: Never commit your OPENAI_API_KEY to Git!
// Store it in .env.local (for local dev) or Vercel environment variables (for production)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// JSON Schema for Structured Outputs (エンドレス級の解説品質)
const graderSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    judgement: { type: 'string', enum: ['correct', 'acceptable', 'incorrect'] },
    score: { type: 'integer', minimum: 0, maximum: 100 },
    bestAnswer: { type: 'string', minLength: 1 },
    fix: { type: 'string', minLength: 1 },
    alsoAcceptable: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 3 },
    grammarFocus: {
      type: 'string',
      enum: [
        'verb_form',
        'tense_aspect',
        'subject_verb',
        'preposition',
        'article',
        'word_choice',
        'missing_word',
        'capitalization',
        'meaning',
      ],
    },
    mistakePointJa: { type: 'string', minLength: 25 },
    ruleJa: { type: 'string', minLength: 60 },
    nuanceJa: { type: 'string', minLength: 50 },
  },
  required: [
    'judgement',
    'score',
    'bestAnswer',
    'fix',
    'alsoAcceptable',
    'grammarFocus',
    'mistakePointJa',
    'ruleJa',
    'nuanceJa',
  ],
};

const unansweredSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    bestAnswer: { type: 'string', minLength: 1 },
    grammarFocus: {
      type: 'string',
      enum: [
        'verb_form',
        'tense_aspect',
        'subject_verb',
        'preposition',
        'article',
        'word_choice',
        'missing_word',
        'capitalization',
        'meaning',
      ],
    },
    patternJa: { type: 'string', minLength: 1 },
    breakdownJa: { type: 'string', minLength: 1 },
    keyPointJa: { type: 'string', minLength: 1 },
    alsoAcceptable: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 3 },
    mistakePointJa: { type: 'string', minLength: 1 },
    ruleJa: { type: 'string', minLength: 1 },
    nuanceJa: { type: 'string', minLength: 1 },
  },
  required: [
    'bestAnswer',
    'grammarFocus',
    'patternJa',
    'breakdownJa',
    'keyPointJa',
    'alsoAcceptable',
    'mistakePointJa',
    'ruleJa',
    'nuanceJa',
  ],
};

const graderSystemPrompt = `You are a professional Japanese tutor for English learners (A1–B1) writing feedback like a language learning app (e.g., Endless).
Write explanations like a professional language learning app (e.g., Endless).
Given a Japanese sentence and the learner's English answer, return ONLY JSON that matches the schema below. No markdown, no extra text.

====================
OUTPUT JSON SCHEMA (MUST MATCH)
{
  "judgement": "correct" | "acceptable" | "incorrect",
  "score": 0-100,
  "bestAnswer": string,
  "fix": string,
  "alsoAcceptable": [string, ...] (max 3),
  "grammarFocus": "verb_form" | "tense_aspect" | "subject_verb" | "preposition" | "article" | "word_choice" | "missing_word" | "capitalization" | "meaning",
  "mistakePointJa": string,
  "ruleJa": string,
  "nuanceJa": string
}
====================

CRITICAL HARD RULES (MUST FOLLOW):
1) Return JSON ONLY. No extra keys. No markdown.
2) bestAnswer and fix MUST:
   - start with a capital letter
   - end with ".", "!", or "?"
3) Choose ONE main grammarFocus (enum) that best explains the mistake.
4) If referenceAnswer is provided, set bestAnswer = referenceAnswer.
5) fix must be the minimal correction of the learner answer when possible.
6) alsoAcceptable MUST NOT be empty.
   - alsoAcceptable[0] MUST equal bestAnswer (exact match).
   - Provide 2–3 items when possible (max 3). Remove duplicates.
4) Scoring (avoid extreme 0–5 when meaning is close):
   - incorrect but meaning is close / almost correct form: score 20–50
   - incorrect and meaning is wrong: score 0–15
   - acceptable: score 60–85
   - correct: score 86–100

QUALITY TEMPLATE (MUST FOLLOW EXACTLY):
CRITICAL: Follow the common structure A→B→C→D→E (in this order) with a professional learning-app tone.

Visual writing style rules (quote usage is STRICT):
- Japanese sentence: quote with 『...』
- English word/phrase/sentence: quote with "..."
- Grammar terms: quote with 『三人称単数』『現在形』『現在進行形』『前置詞』『冠詞』『語法』『疑問文』 etc.

Logical flow rules:
- Always use connectors to show logic: しかし / また / そのため / したがって / この場合 / そして
- Prefer 1 sentence = 1 topic (even if long).

Field templates (map A–E into the 3 fields):

A+B) mistakePointJa (2–3 sentences):
- A (導入): Quote the problem (JP or learner English) with 『...』 and declare the theme.
- B (診断): Quote the learner answer with 『{LEARNER_ANSWER}』 and list 2–3 concrete issues using ①... ②... (③...).
  - Issues must be specific (word choice/form/order/preposition/article/punctuation/capitalization).
  - Quote the wrong parts using "..." (at least one).

C) ruleJa (2–3 sentences + example lines):
- MUST include one grammar label (quoted) from:
  『三人称単数(-s)』『現在進行形』『現在形』『前置詞』『冠詞(a/the)』『語法』『疑問文』
- State the required form with a firm assertion: 「必要があります」 or 「正しいです」.
- MUST include BOTH example lines exactly:
  ×"..."
  ○"..."
- When helpful, add a mini definition or collocation note (e.g., "draw" は「描く」という意味の動詞).

D+E) nuanceJa (2–3 sentences):
- D (置換): MUST include: そのため、最終的な文は『{fix}』になります。
- MUST include: 『{bestAnswer}』は「...」という意味です。
- MUST compare bestAnswer vs fix or alsoAcceptable (meaning/nuance/naturalness/politeness).
- E (効果): MUST end with: これにより、意味が明確で自然な英語になります。

GRADING LOGIC:
- Prioritize: (1) meaning (2) grammar (3) naturalness (4) nuance match.
- If meaning is correct but grammar/nuance slightly off → judgement="acceptable".
- If meaning is wrong OR the sentence form is wrong (e.g., question required but statement given) → judgement="incorrect".
- Accept multiple correct answers when meaning is conveyed.

Return ONLY JSON matching the provided schema (no markdown, no extra text).`;

const validatorSystemPrompt = `You are a strict JSON quality checker for an English learning app.
Your goal: Ensure explanations follow the EXACT template from the grader prompt.

Input:
- Context (JP, LearnerAnswer, optional ReferenceAnswer)
- A JSON object produced by a grader.

CRITICAL QUALITY CHECKS (if ANY fail → needs_regeneration: true):

1. alsoAcceptable:
   - MUST NOT be empty
   - alsoAcceptable[0] MUST exactly equal bestAnswer
   - If ReferenceAnswer is provided (non-empty), bestAnswer MUST exactly equal ReferenceAnswer
   - Remove exact duplicates
   - Should have 2-3 items when possible (max 3)

2. grammarFocus:
   - MUST be one of: verb_form / tense_aspect / subject_verb / preposition / article / word_choice / missing_word / capitalization / meaning

3. mistakePointJa:
   - MUST follow A→B order: introduction then diagnosis
   - MUST include at least one quoted problem statement using 『...』
   - MUST include the learner answer quoted with 『...』
   - MUST list 2–3 concrete issues using numbering: ① ... ② ... (③ ...)
   - MUST quote at least one wrong English part using "..."
   - MUST be specific (word choice/form/order/preposition/article/punctuation/capitalization), not generic like "英語の文になっていません"

4. ruleJa:
   - MUST include one grammar label (quoted) from: 『疑問文』『現在形』『現在進行形』『三人称単数(-s)』『前置詞』『冠詞(a/the)』『語法』
   - MUST include BOTH example lines exactly:
     ×"..."
     ○"..."
   - MUST contain one strong assertion: "必要があります" or "正しいです"
   - MUST explain WHY the rule applies (not just "it's wrong")
   - MUST include at least one connector: しかし / また / そのため / したがって / この場合 / そして

5. nuanceJa:
   - MUST include: 『{bestAnswer}』は「...」という意味です。
   - MUST compare bestAnswer vs fix or alsoAcceptable (difference/nuance)
   - MUST include: 最終的な文は『{fix}』になります
   - MUST end with: これにより、意味が明確で自然な英語になります。

6. Format:
   - bestAnswer and fix must start with capital letter
   - Must end with . ! or ?

7. Scoring:
   - If score is 0-5 but meaning is close → needs_regeneration (score should be 20-50)
   - incorrect: 0-15 (wrong meaning) or 20-50 (close meaning)
   - acceptable: 60-85
   - correct: 86-100

If ANY critical check fails, return ONLY:
{"needs_regeneration": true, "reason": "解説が不十分です（A→B→C→D→E構成、①②の診断、×/○例、文法ラベル、意味・最終文、引用（『』/\"\"）が不足しています）"}

Otherwise, return the corrected JSON with minor fixes only.
- Ensure alsoAcceptable[0] === bestAnswer
- Return ONLY the JSON (no markdown, no extra text).`;

const unansweredSystemPrompt = `You are a Japanese tutor for English learners (A1–B1).
This is "UNANSWERED MODE": the learner submitted no answer.
Do NOT criticize. Teach why the bestAnswer is correct.

Return ONLY JSON matching the provided schema.

Writing rules:
- Follow the same professional explanation style as the main grader (A→B→C→D→E flow).
- Quote usage is STRICT: Japanese 『...』 / English "..." / grammar terms 『...』.
- patternJa: explain the English sentence pattern (型) in 1–2 sentences.
- breakdownJa: map Japanese meaning to English parts (対応関係) in 2–3 short sentences.
- keyPointJa: one memorization tip in 1 sentence.
- alsoAcceptable: include bestAnswer + 1–2 natural paraphrases when possible.
- grammarFocus: choose ONE main focus (enum) that best explains the key point.
- mistakePointJa: 2–3 sentences. Start by quoting 『{JP}』 and declare the theme. Mention it is unanswered, then list 2–3 learning points as ①②(③).
- ruleJa: 2–3 sentences + example lines. MUST include one grammar label (quoted) and BOTH lines: ×"..." and ○"...". Explain WHY, using connectors like しかし/また/そのため/したがって.
- nuanceJa: 2–3 sentences. MUST include: 『{bestAnswer}』は「...」という意味です。 MUST include: そのため、最終的な文は『{bestAnswer}』になります。 End with: これにより、意味が明確で自然な英語になります。
- Use simple Japanese.
- Keep each field concise but educational (like a professional learning app).`;

// シンプルな正規化: validatorがNGを返した場合でも最低限のフィールドを埋めて返す
function normalizeEvaluation(raw: any) {
  if (!raw) return null;

  const allowedGrammarFocus = new Set([
    'verb_form',
    'tense_aspect',
    'subject_verb',
    'preposition',
    'article',
    'word_choice',
    'missing_word',
    'capitalization',
    'meaning',
  ]);

  const ensureSentence = (text?: string) => {
    if (!text || typeof text !== 'string' || !text.trim()) return null;
    let t = text.trim();
    // 先頭大文字
    t = t.charAt(0).toUpperCase() + t.slice(1);
    // 文末に .!? がなければドットを付与
    if (!/[.!?]$/.test(t)) t = `${t}.`;
    return t;
  };

  const bestAnswer = ensureSentence(raw.bestAnswer) || ensureSentence(raw.fix) || 'I will try again.';
  const fix = ensureSentence(raw.fix) || bestAnswer;
  const grammarFocus =
    typeof raw.grammarFocus === 'string' && allowedGrammarFocus.has(raw.grammarFocus)
      ? raw.grammarFocus
      : 'meaning';

  const alsoAcceptable: string[] = Array.from(
    new Set([bestAnswer, ...(Array.isArray(raw.alsoAcceptable) ? raw.alsoAcceptable : [])])
  )
    .map(ensureSentence)
    .filter((v): v is string => Boolean(v))
    .slice(0, 3);

  if (alsoAcceptable.length === 0) {
    alsoAcceptable.push(bestAnswer);
  }

  return {
    judgement: raw.judgement || 'incorrect',
    score:
      typeof raw.score === 'number' && raw.score >= 0 && raw.score <= 100
        ? Math.round(raw.score)
        : 50,
    bestAnswer,
    fix,
    alsoAcceptable,
    grammarFocus,
    mistakePointJa:
      raw.mistakePointJa ||
      'どこが誤りかを特定できませんでした。もう一度、主語＋動詞がそろった英文として書き直してみてください。',
    ruleJa:
      raw.ruleJa ||
      '文法ルールの説明を生成できませんでした。語順（疑問文/肯定文）や動詞の形（be動詞/一般動詞）を確認し、×"短い誤り例"/○"短い正しい例"の形で整理してみましょう。',
    nuanceJa:
      raw.nuanceJa ||
      '意味・ニュアンスの説明を生成できませんでした。bestAnswer の意味を日本語にした上で、fix や別表現との違い（丁寧さ/自然さなど）を比べてみてください。これにより、意味が明確で自然な英語になります。',
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jp, userAnswer, level = 'A1', tags = [], referenceAnswer } = body;

    if (!jp) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: jp' },
        { status: 400 }
      );
    }

    const trimmedAnswer = (userAnswer || '').trim();

    // unanswered branch
    if (!trimmedAnswer || trimmedAnswer === '（未回答）') {
      const ref = referenceAnswer || '';
      const unansweredUserPrompt = `JP: ${jp}
Reference answer (if provided, use as bestAnswer): ${ref}
Level: ${level}
Tags: ${tags.join(', ')}

Important:
- If reference answer is empty, propose an appropriate bestAnswer yourself.
- alsoAcceptable should include bestAnswer plus 1–2 alternatives when possible.

Explain why the bestAnswer is correct for this JP sentence.`;

      const unanswered = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: unansweredSystemPrompt },
          { role: 'user', content: unansweredUserPrompt },
        ],
        temperature: 0.2,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'unanswered_output',
            strict: true,
            schema: unansweredSchema,
          },
        },
      });

      const content = unanswered.choices[0].message.content;
      if (!content) {
        throw new Error('Unanswered AI returned empty response');
      }
      const parsed = JSON.parse(content);
      const answers = [parsed.bestAnswer, ...(Array.isArray(parsed.alsoAcceptable) ? parsed.alsoAcceptable : [])]
        .filter(Boolean)
        .map((s: string) => s.trim());
      const seen = new Set<string>();
      const deduped: string[] = [];
      for (const a of answers) {
        const k = a.toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        deduped.push(a);
      }
      const bestAnswer = deduped[0] || parsed.bestAnswer || ref || jp;
      const alsoAcceptable = deduped.slice(0, 3);

      const normalized = normalizeEvaluation({
        judgement: 'incorrect',
        score: 0,
        bestAnswer,
        fix: bestAnswer,
        alsoAcceptable,
        grammarFocus: parsed.grammarFocus,
        mistakePointJa: parsed.mistakePointJa,
        ruleJa: parsed.ruleJa,
        nuanceJa: parsed.nuanceJa,
      });

      if (!normalized) {
        throw new Error('Failed to normalize unanswered response');
      }

      return NextResponse.json({
        success: true,
        evaluation: {
          ...normalized,
          patternJa: parsed.patternJa,
          breakdownJa: parsed.breakdownJa,
          keyPointJa: parsed.keyPointJa,
        },
      });
    }

    // Step 1: Call Grader AI (with detailed explanation requirements)
    const graderUserPrompt = `JP: ${jp}
Learner answer: ${userAnswer}
Reference answer (use as bestAnswer if provided): ${(referenceAnswer || '').trim()}
Level: ${level}
Tags: ${tags.join(', ')}

Important:
- If referenceAnswer is provided, set bestAnswer = referenceAnswer.
- fix must be the minimal correction of Learner answer if possible.
- alsoAcceptable should include bestAnswer plus 1-2 alternatives when possible.`;

    let graderCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-2024-08-06',
      messages: [
        { role: 'system', content: graderSystemPrompt },
        { role: 'user', content: graderUserPrompt },
      ],
      temperature: 0.2,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'grader_output',
          strict: true,
          schema: graderSchema,
        },
      },
    });

    let graderJson = graderCompletion.choices[0].message.content;
    if (!graderJson) {
      throw new Error('Grader AI returned empty response');
    }
    let graderObject: any = null;
    try {
      graderObject = JSON.parse(graderJson);
    } catch (err) {
      console.warn('Failed to parse grader JSON, will rely on validator:', err);
    }

    // Step 2: Call Validator AI (quality check)
    let validatorUserPrompt = `Context:
JP: ${jp}
LearnerAnswer: ${userAnswer}
ReferenceAnswer: ${(referenceAnswer || '').trim()}

Here is the grader output JSON. Validate and fix if needed:

${graderJson}`;

    let validatorCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: validatorSystemPrompt },
        { role: 'user', content: validatorUserPrompt },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    let validatedJson = validatorCompletion.choices[0].message.content;
    if (!validatedJson) {
      throw new Error('Validator AI returned empty response');
    }

    let result = JSON.parse(validatedJson);

    // Step 3: 自動再生成（解説が不十分な場合）
    if (result.needs_regeneration) {
      console.log('Explanation too generic, regenerating with stricter prompt...');

      const regenerationPrompt = `JP: ${jp}
Learner answer: ${userAnswer}
Reference answer (use as bestAnswer if provided): ${(referenceAnswer || '').trim()}
Level: ${level}
Tags: ${tags.join(', ')}

IMPORTANT: Your previous explanation was rejected because it did not follow the template.
Please regenerate with STRICT adherence to:
- Use 『...』 for Japanese, "..." for English, and quote grammar terms like 『三人称単数』『前置詞』.
- mistakePointJa: A→B structure with ① and ② (2–3 concrete issues) and at least one "..." wrong part.
- ruleJa: include one grammar label + ×"..." and ○"..." lines + explain WHY.
- nuanceJa: include 『{bestAnswer}』は「...」という意味です。 + そのため、最終的な文は『{fix}』になります。 + end with: これにより、意味が明確で自然な英語になります。`;

      graderCompletion = await openai.chat.completions.create({
        model: 'gpt-4o-2024-08-06',
        messages: [
          { role: 'system', content: graderSystemPrompt },
          { role: 'user', content: regenerationPrompt },
        ],
        temperature: 0.3,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'grader_output',
            strict: true,
            schema: graderSchema,
          },
        },
      });

      graderJson = graderCompletion.choices[0].message.content || '';

      // Validate again
      validatorUserPrompt = `Context:
JP: ${jp}
LearnerAnswer: ${userAnswer}
ReferenceAnswer: ${(referenceAnswer || '').trim()}

Here is the regenerated grader output JSON. Validate and fix if needed:

${graderJson}`;

      validatorCompletion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: validatorSystemPrompt },
          { role: 'user', content: validatorUserPrompt },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      validatedJson = validatorCompletion.choices[0].message.content || '';
      result = JSON.parse(validatedJson);
    }

    // Step 4: バリデータNGでも最低限のフィールドを返すフォールバック
    const normalized =
      result.needs_regeneration && graderObject
        ? normalizeEvaluation(graderObject)
        : normalizeEvaluation(result);

    if (!normalized) {
      throw new Error('Failed to normalize AI response');
    }

    return NextResponse.json({
      success: true,
      evaluation: normalized,
    });
  } catch (error: any) {
    console.error('AI grading error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
