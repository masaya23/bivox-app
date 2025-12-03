/**
 * Unit1にbe動詞パートを追加するスクリプト
 * 既存のPart 1-23を Part 2-24にシフトし、新しいbe動詞パートをPart 1として挿入
 */

const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

// 環境変数を先に読み込み
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// OpenAI APIクライアント初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * OpenAI APIを使ってbe動詞の例文を生成
 */
async function generateBeVerbSentences() {
  const prompt = `あなたは英語教育の専門家です。中学生向けの英語例文を作成してください。

文法項目: be動詞（am / is / are：肯定・否定・疑問・短縮）

以下の条件で10個の例文を生成してください：
1. Essential Grammar in Use のスタイルで、日常的でシンプルな表現
2. 中学生が理解しやすい内容
3. 各例文は日本語と英語のペアで
4. 肯定文・否定文・疑問文・短縮形をバランスよく含める
5. I am / You are / He is / She is / It is / We are / They are を網羅
6. 実用的な場面で使える表現

JSON形式で出力してください：
[
  { "jp": "日本語文", "en": "English sentence" },
  ...
]`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert English teacher creating example sentences for Japanese junior high school students."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.8,
      response_format: { type: "json_object" }
    });

    const response = completion.choices[0].message.content;
    const parsed = JSON.parse(response);

    // 配列が直接返される場合とobjectに包まれている場合に対応
    const sentences = Array.isArray(parsed) ? parsed : (parsed.sentences || parsed.examples || []);

    return sentences.slice(0, 10);
  } catch (error) {
    console.error('Error generating be verb sentences:', error.message);
    return [];
  }
}

/**
 * Unit1のJSONファイルを読み込み、be動詞パートを追加して保存
 */
async function addBeVerbPart() {
  console.log('============================================================');
  console.log('Unit1にbe動詞パートを追加します');
  console.log('============================================================\n');

  // Unit1ファイルを読み込み
  const unit1Path = path.join(__dirname, '..', 'data', 'units', 'junior-high-1', 'unit1.json');
  console.log('Unit1ファイルを読み込み中...');
  const unit1Data = JSON.parse(fs.readFileSync(unit1Path, 'utf-8'));

  console.log(`現在のパート数: ${unit1Data.parts.length}`);

  // be動詞の例文を生成
  console.log('\nbe動詞の例文を生成中...');
  const beVerbSentences = await generateBeVerbSentences();

  if (beVerbSentences.length === 0) {
    console.error('エラー: be動詞の例文生成に失敗しました');
    process.exit(1);
  }

  console.log(`✓ ${beVerbSentences.length}個の例文を生成しました`);

  // 新しいbe動詞パートを作成
  const beVerbPart = {
    id: "unit1-p1",
    partNumber: 1,
    title: "be動詞（am / is / are：肯定・否定・疑問・短縮）",
    description: "be動詞の基本形と使い方を練習",
    sentences: beVerbSentences.map((sent, idx) => ({
      id: `unit1-p1-s${idx + 1}`,
      jp: sent.jp,
      en: sent.en,
      tags: ["be動詞"],
      level: "A1",
      nextDue: 0,
      correctCount: 0,
      incorrectCount: 0
    }))
  };

  console.log('\n既存のパートをシフト中...');
  // 既存のパートをすべて1つずつシフト（Part 1→2, Part 2→3, ...）
  const shiftedParts = unit1Data.parts.map((part, index) => {
    const newPartNumber = index + 2; // Part 2から開始
    const newPartId = `unit1-p${newPartNumber}`;

    return {
      ...part,
      id: newPartId,
      partNumber: newPartNumber,
      sentences: part.sentences.map((sentence) => {
        // sentence IDも更新（unit1-p1-s1 → unit1-p2-s1）
        const newSentenceId = sentence.id.replace(/unit1-p\d+/, newPartId);
        return {
          ...sentence,
          id: newSentenceId
        };
      })
    };
  });

  // 新しいパート配列を作成（be動詞パート + シフトされたパート）
  const newParts = [beVerbPart, ...shiftedParts];

  // Unit1データを更新
  unit1Data.parts = newParts;

  console.log(`✓ パートをシフトしました（Part 1-23 → Part 2-24）`);
  console.log(`新しいパート数: ${unit1Data.parts.length}`);

  // ファイルに保存
  console.log('\nファイルに保存中...');
  fs.writeFileSync(unit1Path, JSON.stringify(unit1Data, null, 2), 'utf-8');

  console.log(`✓ Unit1を保存しました: ${unit1Path}`);
  console.log(`  総問題数: ${unit1Data.parts.reduce((sum, p) => sum + p.sentences.length, 0)}問\n`);

  console.log('============================================================');
  console.log('be動詞パートの追加が完了しました！');
  console.log('============================================================');
}

// スクリプト実行
addBeVerbPart().catch(console.error);
