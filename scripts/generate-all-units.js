/**
 * 全Unit例文データ自動生成スクリプト
 * OpenAI APIを使用してEssential Grammar in Useスタイルの例文を生成
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

// Unit設定
const unitsConfig = {
  "units": [
    {
      "unitId": "unit1",
      "title": "Unit 1",
      "description": "中学1年レベルの基礎文法",
      "grade": "junior-high-1",
      "unitNumber": 1,
      "topics": [
        { "part": "part1", "name": "this / that", "priority": "A", "weight": 3 },
        { "part": "part2", "name": "these / those", "priority": "A", "weight": 3 },
        { "part": "part3", "name": "What is (are) 〜 ?", "priority": "A", "weight": 3 },
        { "part": "part4", "name": "人称代名詞の主格", "priority": "A", "weight": 3 },
        { "part": "part5", "name": "人称代名詞の所有格", "priority": "A", "weight": 3 },
        { "part": "part6", "name": "Who is (are) 〜 ?", "priority": "A", "weight": 3 },
        { "part": "part7", "name": "一般動詞", "priority": "A", "weight": 3 },
        { "part": "part8", "name": "how many (much) 〜", "priority": "A", "weight": 3 },
        { "part": "part9", "name": "人称代名詞の目的格", "priority": "A", "weight": 3 },
        { "part": "part10", "name": "人称代名詞の独立所有格", "priority": "B", "weight": 2 },
        { "part": "part11", "name": "命令文 / Let's 〜", "priority": "A", "weight": 3 },
        { "part": "part12", "name": "whose", "priority": "B", "weight": 2 },
        { "part": "part13", "name": "where", "priority": "A", "weight": 3 },
        { "part": "part14", "name": "when", "priority": "A", "weight": 3 },
        { "part": "part15", "name": "which", "priority": "B", "weight": 2 },
        { "part": "part16", "name": "it", "priority": "A", "weight": 3 },
        { "part": "part17", "name": "What time 〜 ?", "priority": "A", "weight": 3 },
        { "part": "part18", "name": "how", "priority": "A", "weight": 3 },
        { "part": "part19", "name": "How old (tall) 〜 ?", "priority": "A", "weight": 3 },
        { "part": "part20", "name": "疑問詞主語の who", "priority": "B", "weight": 2 },
        { "part": "part21", "name": "can", "priority": "A", "weight": 3 },
        { "part": "part22", "name": "現在進行形", "priority": "A", "weight": 3 },
        { "part": "part23", "name": "There is (are) 〜", "priority": "A", "weight": 3 }
      ]
    },
    {
      "unitId": "unit2",
      "title": "Unit 2",
      "description": "中学2年レベルの文法",
      "grade": "junior-high-2",
      "unitNumber": 2,
      "topics": [
        { "part": "part1", "name": "過去形", "priority": "A", "weight": 3 },
        { "part": "part2", "name": "過去進行形", "priority": "A", "weight": 3 },
        { "part": "part3", "name": "when 節", "priority": "A", "weight": 3 },
        { "part": "part4", "name": "一般動詞の SVC", "priority": "B", "weight": 2 },
        { "part": "part5", "name": "SVO + to (for)", "priority": "B", "weight": 2 },
        { "part": "part6", "name": "SVOO", "priority": "B", "weight": 2 },
        { "part": "part7", "name": "will（単純未来）", "priority": "A", "weight": 3 },
        { "part": "part8", "name": "will（意志未来）", "priority": "A", "weight": 3 },
        { "part": "part9", "name": "will（依頼）/ shall（申し出・誘い）", "priority": "B", "weight": 2 },
        { "part": "part10", "name": "be going to", "priority": "A", "weight": 3 },
        { "part": "part11", "name": "must / may", "priority": "A", "weight": 3 },
        { "part": "part12", "name": "have to", "priority": "A", "weight": 3 },
        { "part": "part13", "name": "be able to", "priority": "B", "weight": 2 },
        { "part": "part14", "name": "感嘆文", "priority": "B", "weight": 2 },
        { "part": "part15", "name": "不定詞 — 名詞的用法", "priority": "B", "weight": 2 },
        { "part": "part16", "name": "不定詞 — 副詞的用法（目的）", "priority": "A", "weight": 3 },
        { "part": "part17", "name": "不定詞 — 副詞的用法（感情の原因）", "priority": "B", "weight": 2 },
        { "part": "part18", "name": "不定詞 — 形容詞的用法", "priority": "B", "weight": 2 },
        { "part": "part19", "name": "動名詞", "priority": "A", "weight": 3 },
        { "part": "part20", "name": "原級比較", "priority": "A", "weight": 3 },
        { "part": "part21", "name": "比較級 — er 形", "priority": "A", "weight": 3 },
        { "part": "part22", "name": "最上級 — est 形", "priority": "A", "weight": 3 },
        { "part": "part23", "name": "比較級 — more", "priority": "A", "weight": 3 },
        { "part": "part24", "name": "最上級 — most", "priority": "A", "weight": 3 },
        { "part": "part25", "name": "比較級 — 副詞", "priority": "A", "weight": 3 },
        { "part": "part26", "name": "最上級 — 副詞", "priority": "A", "weight": 3 },
        { "part": "part27", "name": "比較級、最上級を使った疑問詞の文", "priority": "A", "weight": 3 },
        { "part": "part28", "name": "現在完了 — 継続", "priority": "B", "weight": 2 },
        { "part": "part29", "name": "現在完了 — 完了", "priority": "B", "weight": 2 },
        { "part": "part30", "name": "現在完了 — 経験", "priority": "B", "weight": 2 },
        { "part": "part31", "name": "現在完了進行形", "priority": "C", "weight": 1 },
        { "part": "part32", "name": "that 節", "priority": "A", "weight": 3 },
        { "part": "part33", "name": "受身 — 1", "priority": "C", "weight": 1 },
        { "part": "part34", "name": "受身 — 2", "priority": "C", "weight": 1 }
      ]
    },
    {
      "unitId": "unit3",
      "title": "Unit 3",
      "description": "中学3年レベルの文法",
      "grade": "junior-high-3",
      "unitNumber": 3,
      "topics": [
        { "part": "part1", "name": "従属節を導く接続詞 — 1", "priority": "A", "weight": 3 },
        { "part": "part2", "name": "従属節を導く接続詞 — 2", "priority": "A", "weight": 3 },
        { "part": "part3", "name": "間接疑問文", "priority": "B", "weight": 2 },
        { "part": "part4", "name": "疑問詞 + to 不定詞", "priority": "B", "weight": 2 },
        { "part": "part5", "name": "形式主語の it", "priority": "B", "weight": 2 },
        { "part": "part6", "name": "SVO + to 不定詞", "priority": "B", "weight": 2 },
        { "part": "part7", "name": "SVOC", "priority": "B", "weight": 2 },
        { "part": "part8", "name": "現在分詞修飾", "priority": "B", "weight": 2 },
        { "part": "part9", "name": "過去分詞修飾", "priority": "B", "weight": 2 },
        { "part": "part10", "name": "関係代名詞・主格（人）", "priority": "B", "weight": 2 },
        { "part": "part11", "name": "関係代名詞・主格（人以外）", "priority": "B", "weight": 2 },
        { "part": "part12", "name": "関係代名詞・所有格 whose と of which", "priority": "C", "weight": 1 },
        { "part": "part13", "name": "関係代名詞・目的格（人）", "priority": "B", "weight": 2 },
        { "part": "part14", "name": "関係代名詞・目的格（人以外）", "priority": "B", "weight": 2 },
        { "part": "part15", "name": "先行詞を含む関係代名詞 what", "priority": "B", "weight": 2 },
        { "part": "part16", "name": "too 〜 to 〜", "priority": "A", "weight": 3 },
        { "part": "part17", "name": "enough 〜 to 〜", "priority": "A", "weight": 3 },
        { "part": "part18", "name": "so 〜 that ⋯", "priority": "A", "weight": 3 },
        { "part": "part19", "name": "原形不定詞・知覚", "priority": "B", "weight": 2 },
        { "part": "part20", "name": "原形不定詞・使役", "priority": "B", "weight": 2 },
        { "part": "part21", "name": "関係副詞・where", "priority": "B", "weight": 2 },
        { "part": "part22", "name": "関係副詞・when", "priority": "B", "weight": 2 }
      ]
    }
  ]
};

/**
 * OpenAI APIを使って例文を生成
 */
async function generateSentences(grammarTopic, count = 10) {
  const prompt = `あなたは英語教育の専門家です。中学生向けの英語例文を作成してください。

文法項目: ${grammarTopic}

以下の条件で${count}個の例文を生成してください：
1. Essential Grammar in Use のスタイルで、日常的でシンプルな表現
2. 中学生が理解しやすい内容
3. 各例文は日本語と英語のペアで
4. 同じパターンの繰り返しを避け、バラエティを持たせる
5. 実用的な場面で使える表現

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

    return sentences.slice(0, count);
  } catch (error) {
    console.error(`Error generating sentences for ${grammarTopic}:`, error.message);
    return [];
  }
}

/**
 * Unitデータを生成
 */
async function generateUnit(unitConfig) {
  console.log(`\n生成中: ${unitConfig.title} (${unitConfig.topics.length}パート)`);

  const parts = [];

  for (let i = 0; i < unitConfig.topics.length; i++) {
    const topic = unitConfig.topics[i];
    console.log(`  Part ${i + 1}/${unitConfig.topics.length}: ${topic.name}`);

    // 例文を生成
    const generatedSentences = await generateSentences(topic.name, 10);

    // Sentence形式に変換
    const sentences = generatedSentences.map((sent, idx) => ({
      id: `${unitConfig.unitId}-p${i + 1}-s${idx + 1}`,
      jp: sent.jp,
      en: sent.en,
      tags: [topic.name],
      level: unitConfig.grade === 'junior-high-1' ? 'A1' : unitConfig.grade === 'junior-high-2' ? 'A2' : 'B1',
      nextDue: 0,
      correctCount: 0,
      incorrectCount: 0
    }));

    parts.push({
      id: `${unitConfig.unitId}-p${i + 1}`,
      partNumber: i + 1,
      title: topic.name,
      description: `${topic.name}の使い方を練習`,
      sentences: sentences
    });

    // API rate limit対策で少し待機
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return {
    id: unitConfig.unitId,
    title: unitConfig.title,
    description: unitConfig.description,
    grade: unitConfig.grade,
    unitNumber: unitConfig.unitNumber,
    parts: parts
  };
}

/**
 * メイン実行
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Unit例文データ自動生成を開始します');
  console.log('='.repeat(60));

  if (!process.env.OPENAI_API_KEY) {
    console.error('エラー: OPENAI_API_KEYが設定されていません');
    console.error('.envファイルにOPENAI_API_KEY=your-api-keyを設定してください');
    process.exit(1);
  }

  for (const unitConfig of unitsConfig.units) {
    try {
      const unitData = await generateUnit(unitConfig);

      // ファイルに保存
      const dirMap = {
        'junior-high-1': 'junior-high-1',
        'junior-high-2': 'junior-high-2',
        'junior-high-3': 'junior-high-3'
      };

      const dir = path.join(__dirname, '..', 'data', 'units', dirMap[unitConfig.grade]);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const filePath = path.join(dir, `${unitConfig.unitId}.json`);
      fs.writeFileSync(filePath, JSON.stringify(unitData, null, 2), 'utf-8');

      console.log(`✓ ${unitConfig.title} を保存しました: ${filePath}`);
      console.log(`  総問題数: ${unitData.parts.reduce((sum, p) => sum + p.sentences.length, 0)}問\n`);

    } catch (error) {
      console.error(`エラー: ${unitConfig.title}の生成に失敗しました`, error);
    }
  }

  console.log('='.repeat(60));
  console.log('すべてのUnitデータ生成が完了しました！');
  console.log('='.repeat(60));
}

// スクリプト実行
main().catch(console.error);
