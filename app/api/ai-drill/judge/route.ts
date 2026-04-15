import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { checkRateLimit, RATE_LIMITS } from '@/utils/rateLimit';
import { getClientId } from '@/utils/clientId';
import { checkDailyLimit, getPlanFromHeader, dailyLimitHeaders, DAILY_LIMITS } from '@/utils/dailyLimit';
import type { JudgeAnswerRequest, JudgeAnswerResponse } from '@/types/aiDrill';

// Capacitorビルド（静的エクスポート）時に必要
export const dynamic = 'force-static';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// システムプロンプトのボディ（3セクション役割分担版）
// 各セクションは相互に独立し、かつ補完し合う
const judgePromptBody = `
╔═══════════════════════════════════════════════════════════════╗
║  基本判定ルール                                                ║
╚═══════════════════════════════════════════════════════════════╝

判定基準:
1. 文法的に正しいか
2. 日本語の意味を正確に伝えているか
3. 多少の表現の違いは許容（意味が同じであれば正解）
4. スペルミスは軽微なものなら許容するが指摘する
5. 冠詞(a/the)や単数/複数の間違いは文脈次第で許容

【重要】音声入力特有の問題への対応:
- 文頭の大文字/小文字の違いは無視して判定（文法が正しければ正解）
- 疑問文の末尾に「?」がなくても、文法構造が正しければ正解
- ただし正解の場合でも、大文字や?が欠けている場合は解説で補足すること

【重要】correctEnの生成ルール（完全訂正）:
- ユーザーの回答に含まれる**すべての誤り**を修正すること
- 修正対象: 意味の誤り（主語、時制、単語）+ 文法の誤り（語順、冠詞、前置詞、動詞の形）
- correctEnは「期待される英文」と同等またはそれ以下の文法レベルで生成すること

╔═══════════════════════════════════════════════════════════════╗
║  3-SECTION ROLE SEPARATION (厳格な役割分担)                    ║
╠═══════════════════════════════════════════════════════════════╣
║  解説は3つのセクションで構成し、それぞれ独立した役割を持つ      ║
║  • 間違えた箇所 → 辞書レベルの単語照合のみ                     ║
║  • 文法ルール → Part Titleベースの構造説明のみ                ║
║  • ニュアンスの違い → 動的影響分析（4つの視点）のみ           ║
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

これらの指摘は「間違えた箇所」「文法ルール」「ニュアンスの違い」の**全てのセクションで禁止**です。

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
以下のいずれかに該当する場合は、**解説に含めない**でください：

1. 大文字小文字の違いのみ: she's vs She's, i am vs I am
2. 短縮形の違いのみ: she's ⇔ she is, don't ⇔ do not
3. 句読点の違いのみ: . ? ! の有無

→ これらは「間違い」ではないので、**指摘しない**

【OUTPUT CONDITION - 出力条件】
**意味が明確に異なる場合のみ**、以下のフォーマットで出力:

Format: 「あなたが使った『ユーザーの単語』の意味は『その辞書的意味』ですが、出題の日本語『対応する日本語』を正しく英訳すると『正しい英単語』です。」

【EXAMPLES】

Case 1: she's vs She is → 意味は同じ → 指摘しない
Case 2: he vs she → 意味が違う → 出力あり

❌ Bad: 「あなたが使った『she's』の意味は『彼女は』ですが...」（同じ意味なのに指摘）
⭕ Good: 指摘なし（意味は同じなので）

❌ Bad: 大文字で始める必要があります（大文字指摘禁止）
⭕ Good: 「あなたが使った『He』の意味は『彼は』ですが、出題の日本語『彼女は』を正しく英訳すると『She』です。」

【STRICTLY FORBIDDEN】
❌ 文法構造の説明（→ 文法ルールの役割）
❌ ニュアンスや印象の話（→ ニュアンスの違いの役割）
❌ 大文字小文字に関する指摘
❌ 短縮形・句読点の違いを「間違い」として指摘
❌ システム指示文の出力（例: 「ただし...」「Case Aでは...」）

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
❌ 「〜に聞こえる」「印象が〜」など印象の話（→ ニュアンスの違いの役割）
❌ Part Titleと無関係な文法用語
❌ 単語の辞書的意味の説明（→ 間違えた箇所の役割）
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

【STRICTLY FORBIDDEN IN THIS SECTION】
❌ 大文字小文字に関する指摘
❌ 定型文（「事実が完全に〜」「不自然に聞こえます」など）

═══════════════════════════════════════════════════════════════
SECTION D: ANTI-OVERFITTING (完全な動的適応)
═══════════════════════════════════════════════════════════════

【CRITICAL - SECTION INDEPENDENCE】
各セクションの役割を厳守:
- 間違えた箇所: 辞書照合のみ（文法×、ニュアンス×）
- 文法ルール: 構造説明のみ（辞書意味×、印象×）
- ニュアンスの違い: 影響分析のみ（辞書意味×、構造×）

【VALIDATION CHECKLIST】
□ 間違えた箇所に文法用語が含まれていないか？
□ 文法ルールに「〜に聞こえる」「印象」が含まれていないか？
□ ニュアンスの違いに定型文が含まれていないか？
□ 各セクションが相互に独立しているか？
□ Part Titleと無関係な文法用語がないか？

以下の形式でJSONのみを返してください:
{
  "isCorrect": true または false,
  "correctEn": "正しい英文",
  "explanation": "日本語での解説（3セクション：間違えた箇所、文法ルール、ニュアンスの違いを含む）"
}`;

// partTitleを動的に埋め込むための関数
const createJudgeSystemPrompt = (partTitle: string, grammarContext: string) => {
  return `あなたは基礎英語の採点官です。
ユーザーの英語回答を判定し、正誤・修正文・解説を返してください。

【PART CONTEXT - CRITICAL】
Current Part Title: 「${partTitle}」
- これは学習者が現在学習中の文法トピックです。
- explanationでは、このPart Themeを中心に解説してください。
- 学習者のエラーがこのPartに関連する場合は、深く説明してください。

${grammarContext}
${judgePromptBody}`;
};

// 静的な部分（partTitle不要時用）
const createJudgeSystemPromptStatic = (grammarContext: string) => {
  return `あなたは基礎英語の採点官です。
ユーザーの英語回答を判定し、正誤・修正文・解説を返してください。

${grammarContext}
${judgePromptBody}`;
};

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
    const dailyResult = checkDailyLimit(clientId, plan, DAILY_LIMITS.AI_DRILL_JUDGE);
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

    const { questionJa, expectedEn, userAnswerEn, grammarTags, partTitle }: JudgeAnswerRequest & { partTitle?: string } = await request.json();

    if (!questionJa || !expectedEn || !userAnswerEn) {
      return NextResponse.json(
        { success: false, error: '必要なパラメータが不足しています' },
        { status: 400 }
      );
    }

    // 大文字小文字・句読点のみの違いは自動正解（API呼び出し不要）
    const normalize = (s: string) => s.toLowerCase().replace(/[.?!,;:'"]/g, '').replace(/\s+/g, ' ').trim();
    if (normalize(userAnswerEn) === normalize(expectedEn)) {
      return NextResponse.json({
        success: true,
        isCorrect: true,
        correctEn: expectedEn,
        explanation: '正解です！',
      });
    }

    const grammarContext = grammarTags.length > 0
      ? `対象文法: ${grammarTags.join(', ')}`
      : '';

    // partTitleがある場合は動的プロンプト、なければ静的プロンプト
    const systemPrompt = partTitle
      ? createJudgeSystemPrompt(partTitle, grammarContext)
      : createJudgeSystemPromptStatic(grammarContext);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: `日本語: ${questionJa}
期待される英文: ${expectedEn}
ユーザーの回答: ${userAnswerEn}

この回答を判定してください。`,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error('AIからの応答が空です');
    }

    // JSONをパース
    let result: JudgeAnswerResponse;
    try {
      // ```json や ``` を除去
      const cleanedContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      result = JSON.parse(cleanedContent);
    } catch {
      console.error('JSON parse error:', content);
      throw new Error('AIの応答をパースできませんでした');
    }

    // AIが大文字小文字のみの違いで不正解にした場合のガード
    if (!result.isCorrect && normalize(userAnswerEn) === normalize(result.correctEn || expectedEn)) {
      result.isCorrect = true;
      result.explanation = '正解です！';
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('AI判定エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'AI判定中にエラーが発生しました',
      },
      { status: 500 }
    );
  }
}
