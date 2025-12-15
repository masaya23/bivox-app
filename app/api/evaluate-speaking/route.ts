import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { checkRateLimit, RATE_LIMITS } from '@/utils/rateLimit';
import { getClientId } from '@/utils/clientId';

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
  "alsoAcceptable": ["bestAnswerを含む、同じ意味の自然な英語表現を1-3個"]
}

Writing rules:
- patternJa: explain the English sentence pattern (型) in 1–2 sentences.
- breakdownJa: map Japanese meaning to English parts (対応関係) in 2–3 short sentences.
- keyPointJa: one memorization tip in 1 sentence.
- alsoAcceptable: include bestAnswer + 1–2 natural paraphrases when possible.
- Use simple Japanese.
- Keep each field concise but educational (like a professional learning app).`;

// 回答ありの場合のシステムプロンプト（テンプレ強制版）
const graderSystemPrompt = `You are a Japanese tutor for English learners (A1–B1).
Write explanations like a professional language learning app.

Return ONLY JSON matching this exact format.

CRITICAL: You must follow the exact templates below.

1) mistakePointJa template (1–2 sentences):
- Start with: 「{LEARNER_ANSWER}」では、
- Quote the wrong part in 「」.
- Say WHAT is wrong (form/word/preposition/etc). Do NOT be generic.

2) ruleJa template (2–3 sentences):
- Must include a grammar label from this list:
  現在形 / 現在進行形 / 三人称単数(-s) / 前置詞 / 冠詞(a/the) / 語法 / 疑問文 / 過去形
- Must include BOTH examples:
  ×「(wrong short phrase)」
  ○「(correct short phrase)」
- Explain WHY the rule applies here.

3) nuanceJa template (2–3 sentences):
- Must include: 「{bestAnswer}」は「(Japanese meaning)」という意味です。
- Explain difference between bestAnswer and fix (or alsoAcceptable) if any.
- End with: これにより、意味が明確で自然な英語になります。

Also:
- Choose ONE main grammarFocus (enum) that best explains the mistake.
- If learner answer is not a sentence, explain why (missing verb / wrong be+V form etc).
- Avoid saying only "英語の文になっていません" without the rule.

JSON format:
{
  "judgement": "correct" | "acceptable" | "incorrect",
  "score": 0-100の整数,
  "bestAnswer": "模範解答（referenceAnswerを優先）",
  "fix": "学習者の回答を最小限に修正した英文",
  "alsoAcceptable": ["bestAnswerを含む同じ意味の自然な表現を1-3個"],
  "grammarFocus": "verb_form" | "tense_aspect" | "subject_verb" | "preposition" | "article" | "word_choice" | "missing_word" | "capitalization" | "meaning" | "question_form",
  "mistakePointJa": "間違いの指摘（テンプレート通り）",
  "ruleJa": "文法ルールの説明（×と○の例を含む）",
  "nuanceJa": "ニュアンスと意味の説明",
  "feedback": "励ましを含むフィードバック（日本語、1-2文）",
  "encouragement": "励ましの言葉（1文）"
}`;

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

    const { japaneseText, correctAnswer, userAnswer } = await request.json();

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

    let completion;

    if (isUnanswered) {
      // 未回答モード: 解き方を教える
      completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
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
            naturalExpressions: explanation.alsoAcceptable || [correctAnswer],
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
    } else {
      // 回答ありモード: 評価する（テンプレ強制版）
      completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: graderSystemPrompt,
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

      // 従来形式に変換して返す
      const evaluation = {
        score: graderResult.score || 0,
        isCorrect: graderResult.judgement === 'correct' || graderResult.judgement === 'acceptable' || graderResult.score >= 70,
        meaningCorrect: graderResult.judgement !== 'incorrect',
        grammarCorrect: graderResult.grammarFocus === undefined || ['meaning', 'word_choice'].includes(graderResult.grammarFocus),
        feedback: graderResult.feedback || '',
        correction: graderResult.fix || graderResult.bestAnswer || correctAnswer,
        explanation: '',
        encouragement: graderResult.encouragement || '',
        naturalExpressions: graderResult.alsoAcceptable || [correctAnswer],
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
