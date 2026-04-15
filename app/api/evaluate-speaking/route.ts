import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { checkRateLimit, RATE_LIMITS } from '@/utils/rateLimit';
import { getClientId } from '@/utils/clientId';
import { checkDailyLimit, getPlanFromHeader, dailyLimitHeaders, DAILY_LIMITS } from '@/utils/dailyLimit';

// Capacitorビルド（静的エクスポート）時に必要
export const dynamic = 'force-static';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 未回答時のシステムプロンプト
const unansweredSystemPrompt = `You are a Japanese tutor for English learners (A1–B1).
This is "UNANSWERED MODE": the learner submitted no answer.
Do NOT criticize. Teach why the bestAnswer is correct.

Return ONLY JSON matching this exact format:
{
  "bestAnswer": "正解の英文（模範解答をそのまま使用）",
  "patternJa": "英語の型（例：be動詞の疑問文は「Are/Is/Am + 主語 + 補語 + ?」の形）を1-2文で説明",
  "breakdownJa": "日本語と英語の対応関係を2-3文で説明（例：「あなたは〜ですか？」→「Are you〜?」のように）",
  "keyPointJa": "覚えるべきポイントを1文で（例：疑問文はbe動詞を主語の前に出す）",
  "alsoAcceptable": ["bestAnswerを含む、同じ意味の自然な英語表現を1-3個（品質基準を満たすもののみ）"]
}

Writing rules:
- patternJa: explain the English sentence pattern (型) in 1–2 sentences.
- breakdownJa: map Japanese meaning to English parts (対応関係) in 2–3 short sentences.
- keyPointJa: one memorization tip in 1 sentence.

MULTI-SENTENCE HANDLING:
- If the reference answer contains multiple sentences (e.g. a question + answer pair like
  "Are you a student?" "Yes, I am."), you MUST explain EACH sentence separately.
- patternJa: explain the pattern for BOTH the question AND the answer.
  Example: 「疑問文は『Are/Is + 主語 + 補語?』の形。答えは『Yes, 主語 + be動詞.』の形です。」
- breakdownJa: map BOTH sentences from JP to EN.
  Example: 「『あなたは学生ですか？』→『Are you a student?』。『はい、そうです。』→『Yes, I am.』」
- keyPointJa: cover the key point for the overall exchange.
- alsoAcceptable: STRICT QUALITY RULES:
  1) Include bestAnswer first.
  2) Only add alternatives IF they are natural AND same/lower grammar complexity.
  3) Do NOT add unnatural expressions just to fill the array.
  4) 1 item is fine if no good alternatives exist.
  5) If you include a contraction variant, you MUST also include a genuinely different expression.
  ❌ Bad: ["I am a student.", "I'm a student."] (ONLY contraction, no different expression)
  ❌ Bad: ["How are you? - I'm fine.", "How are you? I'm fine."] (only dash difference)
  ⭕ Good: ["I am a student."] (single answer is fine)
  ⭕ Good: ["I am a student.", "I'm a student.", "I'm a pupil."] (contraction + different expression)
  ⭕ Good: ["I have five pens.", "I've got five pens."] (genuinely different expression)
- Use simple Japanese.
- Keep each field concise but educational (like a professional learning app).`;

// 回答ありの場合のシステムプロンプト（3セクション役割分担版）
// 各セクションは相互に独立し、かつ補完し合う
const graderPromptBody = `
╔═══════════════════════════════════════════════════════════════╗
║  3-SECTION ROLE SEPARATION (厳格な役割分担)                    ║
╠═══════════════════════════════════════════════════════════════╣
║  SECTION A: mistakePointJa → 辞書レベルの単語照合のみ          ║
║  SECTION B: ruleJa → Part Titleベースの構造説明のみ           ║
║  SECTION C: nuanceJa → 動的影響分析（4つの視点）のみ          ║
╚═══════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════
GLOBAL RULE: CASE INSENSITIVITY（大文字小文字の完全無視）
═══════════════════════════════════════════════════════════════

【CRITICAL - 全セクション共通】
ユーザーの回答の「大文字・小文字の違い」は**完全に無視**してください。
- 大文字小文字の違いは**正解として扱う**
- 大文字小文字について**一切言及しない**

【ABSOLUTELY FORBIDDEN - 絶対禁止フレーズ】
❌ 「文頭は大文字にする必要があります」
❌ 「固有名詞は大文字です」
❌ 「小文字になっています」
❌ 「大文字で始めましょう」
❌ 「Capitalization」に関するあらゆる指摘

これらの指摘は「間違えた箇所」「文法ルール」「ニュアンス」の**全てのセクションで禁止**です。

═══════════════════════════════════════════════════════════════
SECTION A: FACT & DICTIONARY CHECK (間違えた箇所)
═══════════════════════════════════════════════════════════════

【ROLE】辞書レベルの単語照合のみ。意味が異なる場合のみ指摘。

【OUTPUT FORMAT BAN - 出力禁止】
❌ NEVER output [ or ] characters
❌ NEVER output variable syntax like $W_{user}$, {variable}
❌ NEVER output system instructions like (ただし...) or (Case A...)
⭕ Use ONLY Japanese quote marks 『』 for highlighting
⭕ Output natural Japanese sentences only

【SILENCE CHECK - 無言判定（最優先）】
以下のいずれかに該当する場合は、**空文字 "" を出力**してください：

1. 大文字小文字の違いのみ: she's vs She's, i am vs I am
2. 短縮形の違いのみ: she's ⇔ she is, don't ⇔ do not
3. 句読点の違いのみ: . ? ! の有無

→ これらは「間違い」ではないので、**何も出力しない**

【OUTPUT CONDITION - 出力条件】
**意味が明確に異なる場合のみ**、以下のフォーマットで出力:

Format: 「あなたが使った『ユーザーの単語』の意味は『その辞書的意味』ですが、出題の日本語『対応する日本語』を正しく英訳すると『正しい英単語』です。」

【EXAMPLES】

Case 1: she's vs She is → 意味は同じ → 出力: ""（空文字）
Case 2: he vs she → 意味が違う → 出力あり

❌ Bad: 「あなたが使った『she's』の意味は『彼女は』ですが...」（同じ意味なのに指摘）
⭕ Good: ""（空文字 - 意味は同じなので何も出力しない）

❌ Bad: 「He」は「彼は」ですが...大文字で始める必要があります（大文字指摘禁止）
⭕ Good: 「あなたが使った『He』の意味は『彼は』ですが、出題の日本語『彼女は』を正しく英訳すると『She』です。」

【STRICTLY FORBIDDEN】
❌ 文法構造の説明（→ SECTION Bの役割）
❌ ニュアンスや印象の話（→ SECTION Cの役割）
❌ 大文字小文字に関する指摘
❌ 短縮形・句読点の違いを「間違い」として指摘
❌ システム指示文の出力（例: 「ただし...」「Case Aでは...」）

【OUTPUT RULES】
- 意味の間違いがある場合のみ: 「{LEARNER_ANSWER}」では、で開始
- 意味の間違いがない場合: 空文字を出力
- Multiple mistakes: 「また、」「さらに、」で接続

═══════════════════════════════════════════════════════════════
SECTION B: STRUCTURAL MECHANISM (文法ルール)
═══════════════════════════════════════════════════════════════

【ROLE】Part Titleから導出した文法構造の仕組みを説明。単語の辞書的意味やニュアンスには触れない。

【DYNAMIC ANALYSIS PROCESS】

STEP 1 - Extract Core Concept:
  - Part Titleから核心となる文法概念を特定
  - 例: "受動態" → 「動作を受ける主語」「be + 過去分詞」
  - 例: "現在完了" → 「過去と現在のつながり」「have + 過去分詞」

STEP 2 - Identify Components:
  - その文法構造の必要最小限の要素を特定
  - 各要素が文中でどう機能するかを説明

STEP 3 - Explain Why:
  - なぜこの構造が必要なのかを2-3文で解説

【OUTPUT FORMAT】
「この文のポイントは**『[Part Titleから導出した文法テーマ]』**です。[構造の仕組みを2-3文で説明]」

【STRICTLY FORBIDDEN - このセクションで禁止】
❌ 比較リスト（×「...」○「...」）
❌ 「〜に聞こえる」「印象が〜」など印象の話（→ SECTION Cの役割）
❌ Part Titleと無関係な文法用語
❌ 単語の辞書的意味の説明（→ SECTION Aの役割）
❌ 大文字小文字に関するルール説明（Capitalization禁止）

═══════════════════════════════════════════════════════════════
SECTION C: DYNAMIC IMPACT ANALYSIS (ニュアンスの違い)
═══════════════════════════════════════════════════════════════

【ROLE】ユーザーの回答が引き起こす具体的な誤解・印象を動的に分析。定型文は使用禁止。

【CRITICAL - NO FIXED TEMPLATES】
以下のような定型文は絶対に使用禁止:
❌ 「事実が完全に変わって伝わってしまいます。」
❌ 「少し不自然に聞こえます。」
❌ 「ニュアンスが弱くなります。」
❌ 「ネイティブには違和感があります。」

【4 PERSPECTIVES FOR DYNAMIC ANALYSIS】
ユーザーの回答と正解を比較し、以下の4視点から最も適切なものを選んで動的に解説:

PERSPECTIVE A - Intent Mismatch（意図のズレ）:
  エラー例: "can" の欠落
  動的生成: 「"can" がないと『〜できる』という能力ではなく『いつも〜する』という習慣の意味になります。」

PERSPECTIVE B - Social Impression（社会的印象）:
  エラー例: "Please" の欠落
  動的生成: 「"Please" がないと『〜しなさい』という命令口調に聞こえ、失礼な印象を与えます。」

PERSPECTIVE C - Information Accuracy（情報の正確さ）:
  エラー例: "always" の欠落、時制のずれ
  動的生成: 「"always" がないと頻度が曖昧になり、『たまに〜する』とも解釈されます。」

PERSPECTIVE D - Sophistication（表現の洗練度）:
  エラー例: 不自然な語順、幼稚な表現
  動的生成: 「この語順は文法的には通じますが、幼い言い回しに聞こえます。」

【OUTPUT PROCESS】
1. ユーザーの回答と正解の差分を特定
2. その差分が引き起こす具体的な誤解/印象を4視点から分析
3. 最も適切な視点を選び、その文脈に合った解説を動的に生成

【SAFETY CONSTRAINT - ハルシネーション防止】
- ユーザーの回答に実際に存在する誤りのみを指摘
- 正解に存在しない単語/構造について言及しない
- 推測や仮定に基づく解説は禁止
- 大文字小文字の違いは「誤り」ではないので言及しない

【OUTPUT FORMAT】
「『{bestAnswer}』は『日本語の意味』という意味です。4視点から選んだ動的な影響分析」

【STRICTLY FORBIDDEN IN THIS SECTION】
❌ 大文字小文字に関する指摘
❌ 定型文（「事実が完全に〜」「不自然に聞こえます」など）

═══════════════════════════════════════════════════════════════
SECTION D: ANTI-OVERFITTING (完全な動的適応)
═══════════════════════════════════════════════════════════════

【CRITICAL - SECTION INDEPENDENCE】
各セクションの役割を厳守:
- mistakePointJa: 辞書照合のみ（文法×、ニュアンス×）
- ruleJa: 構造説明のみ（辞書意味×、印象×）
- nuanceJa: 影響分析のみ（辞書意味×、構造×）

【VALIDATION CHECKLIST】
□ mistakePointJaに文法用語が含まれていないか？
□ ruleJaに「〜に聞こえる」「印象」が含まれていないか？
□ nuanceJaに定型文が含まれていないか？
□ 各セクションが相互に独立しているか？
□ Part Titleと無関係な文法用語がないか？

Also:
- Choose ONE main grammarFocus (enum) that best explains the mistake.
- If learner answer is not a sentence, explain why (missing verb / wrong be+V form etc).
- Avoid saying only "英語の文になっていません" without the rule.

═══════════════════════════════════════════════════════════════
MULTI-SENTENCE HANDLING (疑問文+答え形式など)
═══════════════════════════════════════════════════════════════

When the reference answer contains multiple sentences (e.g. question + answer pair
like "Are you a student?" "Yes, I am." or "How much is this book? - It is one thousand yen."),
follow these rules:

1. EVALUATE BOTH SENTENCES: Check the learner's answer for BOTH the question part
   AND the answer part. If only one part is wrong, identify which part has the error.

   **CRITICAL - MISSING SENTENCE DETECTION:**
   If the reference answer has 2+ sentences but the learner only answered with 1 sentence
   (e.g. only the question part, missing the answer part), you MUST:
   - Point out the missing part explicitly in mistakePointJa
   - Explain the missing part's grammar in ruleJa
   - Include the full corrected answer (both parts) in correctedUserAnswer
   - Score should reflect that a significant part of the answer is missing (typically 30-60%)

   Example: Reference = "How much is this book? - It is one thousand yen."
            Learner = "How much is this book?"
   → mistakePointJa: 「答えの部分『It is one thousand yen.』が抜けています。この問題では疑問文と答えの両方を言う必要があります。」
   → correctedUserAnswer: "How much is this book? - It is one thousand yen."

2. mistakePointJa: If the learner made errors in both sentences, point out each
   separately. Example: 「疑問文では『Are』を使うべきところ『Is』になっています。
   また、答えの部分で『I am』が抜けています。」

3. ruleJa: Explain the grammar rules for BOTH sentence types.
   Example: 「疑問文は『Be動詞 + 主語 + 補語?』の語順です。Yes/Noの答えは
   『Yes/No, 主語 + be動詞.』の形で返します。」

4. nuanceJa: Analyze the impact considering the full exchange context.

5. correctedUserAnswer: Correct ALL sentences in the learner's response.
   If the learner omitted some sentences, ADD the missing sentences to the correction.

6. modelAnswers: Include the full multi-sentence answer as one string.

IMPORTANT - Multiple Model Answers (STRICT QUALITY RULES):
- modelAnswers: Generate model answer variations. Each entry must use DIFFERENT vocabulary or structure.

  RULE 0 - Mandatory Structure:
  - The FIRST entry is always the basic form (基本形) = the reference answer.
  - If you include a contraction variant (e.g. "I'm" for "I am"), you MUST ALSO include
    a genuinely different expression as an additional entry. Never show ONLY basic + contraction.
  - Examples:
    ⭕ Good: ["I am a student.", "I'm a student.", "I'm a pupil."] (basic + contraction + different expression)
    ⭕ Good: ["I am a student."] (single answer - no contraction variant, no different expression needed)
    ⭕ Good: ["I have five pens.", "I've got five pens."] (genuinely different expression)
    ❌ Bad: ["I am a student.", "I'm a student."] (ONLY contraction difference, no different expression)

  RULE 1 - Quality over Quantity:
  - Only add alternatives IF ALL conditions are met:
    a) The expression is commonly used by native speakers
    b) It does NOT deviate from the original Japanese meaning
    c) At least one alternative uses different vocabulary or structure (not just contraction/punctuation)
  - Punctuation-only differences are NOT valid alternatives:
    ❌ Bad: ["How are you? - I'm fine.", "How are you? I'm fine."] (only dash difference)
    ❌ Bad: ["Yes, I do.", "Yes I do."] (only comma difference)
  - If no genuinely different expression exists, return ONLY 1 answer (the basic form).
    Do NOT add a contraction-only variant without also adding a different expression.

  RULE 2 - Complexity Ceiling (Grammar Level Limit):
  - Use the provided reference answer as the GRAMMAR COMPLEXITY CEILING.
  - Alternative answers MUST have EQUAL or LOWER grammatical complexity.
  - NEVER introduce advanced grammar (perfect tense, relative clauses, difficult verbs)
    unless already present in the reference answer.
  - NEVER rearrange the sentence structure in ways that change the grammar pattern.
    The Part Title defines the grammar pattern being practiced — alternatives must use the SAME pattern.
  - ❌ Bad: Reference "Is that Sakura's car?" → Alternative "Is that car Sakura's?" (different structure, possessive moved)
  - ❌ Bad: Reference "I am a student." → Alternative "I'd describe myself as a student." (too complex)
  - ⭕ Good: Reference "I am a student." → Alternative "I'm a student." (same level, same structure)
  - ⭕ Good: Reference "Is that Sakura's car?" → (no valid alternative — return only 1 answer)

  RULE 3 - When in Doubt, Don't:
  - If unsure whether an alternative is appropriate, DO NOT include it.
  - A single high-quality answer is better than multiple questionable ones.

IMPORTANT - Corrected User Answer (Complete Correction):
- correctedUserAnswer: Generate a FULLY CORRECTED version of the learner's answer.
  Follow this 2-step process:

  STEP 1 - Best Match Selection (Truth Anchor):
  - From the modelAnswers array, identify which model answer is STRUCTURALLY closest
    to the learner's attempt (similar words, similar construction).
  - Use this as the "Truth Anchor" for meaning correction.

  STEP 2 - Complete Correction (ALL Errors):
  - Fix ALL errors in the learner's answer, including:
    a) MEANING/FACT errors: Wrong subject (She→He), wrong tense, wrong nouns, negation errors
       → These MUST be corrected to match the Truth Anchor's meaning
    b) GRAMMAR errors: Word order (a not→not a), missing articles, prepositions, verb forms
       → Fix all grammatical mistakes

  CRITICAL RULES:
  - Do NOT preserve the learner's vocabulary if it contradicts the original Japanese meaning
  - Example: JP="彼は先生ではない" + User says "She is a not teacher"
    → Truth Anchor: "He is not a teacher"
    → correctedUserAnswer: "He is not a teacher." (fix BOTH "She→He" AND "a not→not a")
    → NOT "She is not a teacher" (this preserves the wrong subject)
  - The output MUST be grammatically perfect AND convey the exact meaning of the model answer

═══════════════════════════════════════════════════════════════
SCORING RULE: CONTRACTIONS（短縮形）
═══════════════════════════════════════════════════════════════

【CRITICAL - 短縮形は完全正解】
短縮形と非短縮形の違いだけの場合は **score: 100, judgement: "correct"** にしてください。
- "She's" = "She is" → score: 100
- "I'm" = "I am" → score: 100
- "don't" = "do not" → score: 100
- "isn't" = "is not" → score: 100
- "won't" = "will not" → score: 100
- "they've" = "they have" → score: 100
- "he'd" = "he would" / "he had" → score: 100

短縮形の違いは「間違い」ではありません。**減点理由にしないでください。**
短縮形について mistakePointJa, ruleJa, nuanceJa で言及しないでください。

JSON format:
{
  "judgement": "correct" | "acceptable" | "incorrect",
  "score": 0-100の整数,
  "bestAnswer": "模範解答（referenceAnswerを優先）",
  "modelAnswers": ["1-3個の自然な正解例（厳格な品質基準を満たすもののみ）"],
  "correctedUserAnswer": "学習者の回答を最小限の修正で直した英文（元の単語や構文を維持）",
  "grammarFocus": "verb_form" | "tense_aspect" | "subject_verb" | "preposition" | "article" | "word_choice" | "missing_word" | "meaning" | "question_form",
  "mistakePointJa": "間違いの指摘（テンプレート通り）",
  "ruleJa": "文法ルールの説明（×と○の例を含む）",
  "nuanceJa": "ニュアンスと意味の説明",
  "feedback": "励ましを含むフィードバック（日本語、1-2文）",
  "encouragement": "励ましの言葉（1文）"
}`;

// partTitleを動的に埋め込むための関数
const createGraderSystemPrompt = (partTitle: string) => {
  return `You are a Japanese tutor for English learners (A1–B1).
Write explanations like a professional language learning app.

【PART CONTEXT - CRITICAL】
Current Part Title: 「${partTitle}」
- This is the grammar topic the learner is currently studying.
- Your ruleJa explanation MUST focus on this grammar theme.
- Use the Part Title to determine the "Part Theme" in Step 1 of ruleJa.
- If the learner's error is directly related to this Part, explain it in depth.

Return ONLY JSON matching this exact format.

CRITICAL: You must follow the exact templates below.
${graderPromptBody}`;
};

// 静的な部分（partTitle不要時用）
/**
 * 回答例を整理:
 * 1. 句読点のみの違い（ダッシュ有無等）は重複排除
 * 2. 短縮形ペアのみで異なる表現がない場合 → 1つ目だけ残す
 *    （短縮形ペア + 異なる表現がある場合はそのまま全て残す）
 */
function deduplicateModelAnswers(answers: string[]): string[] {
  if (!answers || answers.length <= 1) return answers;

  const expandContractions = (s: string) => {
    let t = s;
    t = t.replace(/\bwon't\b/gi, 'will not');
    t = t.replace(/\bcan't\b/gi, 'can not');
    t = t.replace(/\bshan't\b/gi, 'shall not');
    t = t.replace(/\blet's\b/gi, 'let us');
    t = t.replace(/n't\b/gi, ' not');
    t = t.replace(/'re\b/gi, ' are');
    t = t.replace(/'ve\b/gi, ' have');
    t = t.replace(/'ll\b/gi, ' will');
    t = t.replace(/'m\b/gi, ' am');
    t = t.replace(/'d\b/gi, ' would');
    t = t.replace(/'s\b/gi, ' is');
    return t;
  };

  // 句読点のみの正規化（短縮形は展開しない）
  const normalizePunctuation = (s: string) =>
    s.toLowerCase().replace(/[\s\-–—,;:.!?'"]/g, '').trim();

  // 短縮形も展開した完全正規化
  const normalizeFull = (s: string) =>
    expandContractions(s)
      .toLowerCase()
      .replace(/[\s\-–—,;:.!?'"]/g, '')
      .trim();

  // Step 1: 句読点のみの重複を排除
  const seenPunct = new Set<string>();
  const punctDeduped: string[] = [];
  for (const answer of answers) {
    const key = normalizePunctuation(answer);
    if (!seenPunct.has(key)) {
      seenPunct.add(key);
      punctDeduped.push(answer);
    }
  }

  if (punctDeduped.length <= 1) return punctDeduped;

  // Step 2: 短縮形ペアのみかチェック
  const fullKeys = punctDeduped.map(a => normalizeFull(a));
  const uniqueFullKeys = new Set(fullKeys);

  if (uniqueFullKeys.size === 1) {
    // 全て短縮形の違いだけ → 1つ目だけ残す
    return [punctDeduped[0]];
  }

  // 異なる表現が含まれている → 全て残す
  return punctDeduped;
}

const graderSystemPromptStatic = `You are a Japanese tutor for English learners (A1–B1).
Write explanations like a professional language learning app.

Return ONLY JSON matching this exact format.

CRITICAL: You must follow the exact templates below.
${graderPromptBody}`;

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

    // 日次上限チェック
    const plan = getPlanFromHeader(request.headers.get('x-user-plan'));
    const dailyResult = checkDailyLimit(clientId, plan, DAILY_LIMITS.EVALUATE_SPEAKING);
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

    const { japaneseText, correctAnswer, userAnswer, partTitle } = await request.json();

    if (!japaneseText || !correctAnswer) {
      return NextResponse.json(
        { success: false, error: '必要なパラメータが不足しています' },
        { status: 400 }
      );
    }

    // 未回答かどうかを判定
    const isUnanswered = !userAnswer ||
      userAnswer.trim() === '' ||
      userAnswer.includes('未回答') ||
      userAnswer.includes('無音');

    // 正規化: 大文字小文字・句読点・短縮形の違いを吸収して比較
    const normalizeVariants = (input: string): string[] => {
      const prepared = input
        .toLowerCase()
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/\s+/g, ' ')
        .trim();

      // 'd → would / had の両方を生成
      const withExpandedD = prepared.includes("'d")
        ? [
            prepared.replace(/'d\b/g, ' would'),
            prepared.replace(/'d\b/g, ' had'),
          ]
        : [prepared];

      // 's → is / has の両方を生成（let's は先に処理）
      const expandApostropheS = (variants: string[]): string[] => {
        const result: string[] = [];
        for (const v of variants) {
          const withLets = v.replace(/\blet's\b/g, 'let us');
          if (withLets.includes("'s")) {
            result.push(withLets.replace(/'s\b/g, ' is'));
            result.push(withLets.replace(/'s\b/g, ' has'));
          } else {
            result.push(withLets);
          }
        }
        return result;
      };

      const expandContractions = (text: string) => {
        let t = text;
        // 不規則な短縮形を先に処理
        t = t.replace(/\bwon't\b/g, 'will not');
        t = t.replace(/\bcan't\b/g, 'can not');
        t = t.replace(/\bshan't\b/g, 'shall not');
        t = t.replace(/\blet's\b/g, 'let us');
        // 規則的な短縮形
        t = t.replace(/n't\b/g, ' not');
        t = t.replace(/'re\b/g, ' are');
        t = t.replace(/'ve\b/g, ' have');
        t = t.replace(/'ll\b/g, ' will');
        t = t.replace(/'m\b/g, ' am');
        t = t.replace(/'s\b/g, ' is');
        return t;
      };

      const stripPunctuation = (text: string) =>
        text
          .replace(/[.?!,;:"()]/g, '')
          .replace(/'/g, '')
          .replace(/\s+/g, ' ')
          .trim();

      const withS = expandApostropheS(withExpandedD);
      return withS.map((variant) => stripPunctuation(expandContractions(variant)));
    };

    const isNormalizedMatch =
      !isUnanswered &&
      !!userAnswer &&
      normalizeVariants(userAnswer).some((value) => normalizeVariants(correctAnswer).includes(value));

    let completion;

    if (isUnanswered) {
      // 未回答モード: 解き方を教える
      completion = await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: unansweredSystemPrompt,
          },
          {
            role: 'user',
            content: `JP: ${japaneseText}
Reference answer (use as bestAnswer): ${correctAnswer}

Explain why the bestAnswer is correct for this JP sentence.`,
          },
        ],
        temperature: 0.3,
        max_tokens: 600,
        response_format: { type: 'json_object' },
      });

      const result = completion.choices[0]?.message?.content;

      if (!result) {
        throw new Error('AIからの応答が空です');
      }

      const explanation = JSON.parse(result);

      // 未回答モード用のレスポンス形式に変換
      return NextResponse.json(
        {
          success: true,
          isUnanswered: true,
          evaluation: {
            score: 0,
            isCorrect: false,
            meaningCorrect: false,
            grammarCorrect: false,
            correction: explanation.bestAnswer || correctAnswer,
            correctedUserAnswer: '',
            modelAnswers: deduplicateModelAnswers(explanation.alsoAcceptable || [correctAnswer]),
            naturalExpressions: deduplicateModelAnswers(explanation.alsoAcceptable || [correctAnswer]),
            // 未回答専用フィールド
            patternJa: explanation.patternJa || '',
            breakdownJa: explanation.breakdownJa || '',
            keyPointJa: explanation.keyPointJa || '',
            feedback: '回答がありませんでした。下の解説を読んで、正解の英文を声に出して練習してみましょう！',
            encouragement: '次は挑戦してみましょう！声に出すことで英語が身につきます。',
            explanation: '',
            grammarRule: '',
            nuanceDifference: '',
            mistakeAnalysis: '',
          },
        },
        {
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
          },
        }
      );
    } else if (isNormalizedMatch) {
      // 大文字小文字・句読点・短縮形の違いは自動正解（API呼び出し不要）
      return NextResponse.json(
        {
          success: true,
          isUnanswered: false,
          evaluation: {
            score: 100,
            isCorrect: true,
            meaningCorrect: true,
            grammarCorrect: true,
            feedback: '正解です！',
            correction: correctAnswer,
            correctedUserAnswer: userAnswer,
            explanation: '',
            encouragement: '',
            modelAnswers: [correctAnswer],
            bestAnswer: correctAnswer,
            grammarFocus: undefined,
            mistakePointJa: '',
            ruleJa: '',
            nuanceJa: '',
            patternJa: '',
            breakdownJa: '',
            keyPointJa: '',
            mistakeAnalysis: '',
            grammarRule: '',
            nuanceDifference: '',
          },
        },
        {
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
          },
        }
      );
    } else {
      // 回答ありモード: 評価する（テンプレ強制版）
      // partTitleがある場合は動的にPart-awareプロンプトを生成
      const systemPrompt = partTitle
        ? createGraderSystemPrompt(partTitle)
        : graderSystemPromptStatic;

      completion = await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `JP: ${japaneseText}
Learner answer: ${userAnswer}
Reference answer (use as bestAnswer if provided): ${correctAnswer}

Evaluate the learner's answer. Replace {LEARNER_ANSWER} with "${userAnswer}" and {bestAnswer} with "${correctAnswer}" in your response.`,
          },
        ],
        temperature: 0.3,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      });

      const result = completion.choices[0]?.message?.content;

      if (!result) {
        throw new Error('AIからの応答が空です');
      }

      const graderResult = JSON.parse(result);

      // AIが大文字小文字を指摘した場合は強制的に正解扱いにする
      if (graderResult.grammarFocus === 'capitalization') {
        graderResult.judgement = 'correct';
        graderResult.score = 100;
        graderResult.mistakePointJa = '';
        graderResult.ruleJa = '';
        graderResult.nuanceJa = '';
      }

      // 短縮形の違いのみでスコアが下がっている場合は100点に補正
      // （normalizeVariantsで拾えなかったが、AIが acceptable/correct と判断した場合）
      if (
        graderResult.score >= 80 &&
        graderResult.score < 100 &&
        (graderResult.judgement === 'correct' || graderResult.judgement === 'acceptable')
      ) {
        // ユーザー回答と正解の正規化結果を比較（modelAnswersも含む）
        const allCorrectAnswers = [
          correctAnswer,
          ...(graderResult.modelAnswers || []),
          graderResult.bestAnswer,
        ].filter(Boolean);

        const userVariants = normalizeVariants(userAnswer);
        const isContractionOnly = allCorrectAnswers.some((ans: string) =>
          normalizeVariants(ans).some((v: string) => userVariants.includes(v))
        );
        if (isContractionOnly) {
          graderResult.score = 100;
          graderResult.judgement = 'correct';
          graderResult.mistakePointJa = '';
        }
      }

      const judgement = typeof graderResult.judgement === 'string' ? graderResult.judgement.toLowerCase() : '';
      const hasJudgement = judgement === 'correct' || judgement === 'acceptable' || judgement === 'incorrect';
      const scoreValue = graderResult.score || 0;
      const isCorrect = hasJudgement ? judgement === 'correct' || judgement === 'acceptable' : scoreValue >= 70;
      const meaningCorrect = hasJudgement ? judgement !== 'incorrect' : scoreValue >= 70;

      // 従来形式に変換して返す
      const evaluation = {
        score: scoreValue,
        isCorrect,
        meaningCorrect,
        grammarCorrect: graderResult.grammarFocus === undefined || ['meaning', 'word_choice'].includes(graderResult.grammarFocus),
        feedback: graderResult.feedback || '',
        correction: graderResult.correctedUserAnswer || graderResult.bestAnswer || correctAnswer,
        correctedUserAnswer: graderResult.correctedUserAnswer || '',
        explanation: '',
        encouragement: graderResult.encouragement || '',
        // 複数の回答例（句読点のみの違いは重複排除）
        modelAnswers: deduplicateModelAnswers(
          graderResult.modelAnswers && graderResult.modelAnswers.length > 0
            ? graderResult.modelAnswers
            : [graderResult.bestAnswer || correctAnswer]
        ),
        naturalExpressions: deduplicateModelAnswers(graderResult.modelAnswers || [correctAnswer]),
        grammarRule: graderResult.ruleJa || '',
        nuanceDifference: graderResult.nuanceJa || '',
        mistakeAnalysis: graderResult.mistakePointJa || '',
      };

      return NextResponse.json(
        {
          success: true,
          isUnanswered: false,
          evaluation,
        },
        {
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
          },
        }
      );
    }
  } catch (error) {
    console.error('スピーキング評価エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'スピーキング評価中にエラーが発生しました',
      },
      { status: 500 }
    );
  }
}
