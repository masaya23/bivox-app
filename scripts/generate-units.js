/**
 * Unit例文データ生成スクリプト
 * Essential Grammar in Use スタイルの実用的な例文を生成
 */

const fs = require('fs');
const path = require('path');

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
        { "part": "part1", "name": "this / that", "priority": "A", "weight": 3, "questionCount": 10 },
        { "part": "part2", "name": "these / those", "priority": "A", "weight": 3, "questionCount": 10 },
        { "part": "part3", "name": "What is (are) 〜 ?", "priority": "A", "weight": 3, "questionCount": 10 },
        { "part": "part4", "name": "人称代名詞の主格", "priority": "A", "weight": 3, "questionCount": 10 },
        { "part": "part5", "name": "人称代名詞の所有格", "priority": "A", "weight": 3, "questionCount": 10 },
        { "part": "part6", "name": "Who is (are) 〜 ?", "priority": "A", "weight": 3, "questionCount": 10 },
        { "part": "part7", "name": "一般動詞", "priority": "A", "weight": 3, "questionCount": 10 },
        { "part": "part8", "name": "how many (much) 〜", "priority": "A", "weight": 3, "questionCount": 10 },
        { "part": "part9", "name": "人称代名詞の目的格", "priority": "A", "weight": 3, "questionCount": 10 },
        { "part": "part10", "name": "人称代名詞の独立所有格", "priority": "B", "weight": 2, "questionCount": 10 },
        { "part": "part11", "name": "命令文 / Let's 〜", "priority": "A", "weight": 3, "questionCount": 10 },
        { "part": "part12", "name": "whose", "priority": "B", "weight": 2, "questionCount": 10 },
        { "part": "part13", "name": "where", "priority": "A", "weight": 3, "questionCount": 10 },
        { "part": "part14", "name": "when", "priority": "A", "weight": 3, "questionCount": 10 },
        { "part": "part15", "name": "which", "priority": "B", "weight": 2, "questionCount": 10 },
        { "part": "part16", "name": "it", "priority": "A", "weight": 3, "questionCount": 10 },
        { "part": "part17", "name": "What time 〜 ?", "priority": "A", "weight": 3, "questionCount": 10 },
        { "part": "part18", "name": "how", "priority": "A", "weight": 3, "questionCount": 10 },
        { "part": "part19", "name": "How old (tall) 〜 ?", "priority": "A", "weight": 3, "questionCount": 10 },
        { "part": "part20", "name": "疑問詞主語の who", "priority": "B", "weight": 2, "questionCount": 10 },
        { "part": "part21", "name": "can", "priority": "A", "weight": 3, "questionCount": 10 },
        { "part": "part22", "name": "現在進行形", "priority": "A", "weight": 3, "questionCount": 10 },
        { "part": "part23", "name": "There is (are) 〜", "priority": "A", "weight": 3, "questionCount": 10 }
      ]
    },
    {
      "unitId": "unit2",
      "title": "Unit 2",
      "description": "中学2年レベルの文法",
      "grade": "junior-high-2",
      "unitNumber": 2,
      "topics": [
        { "part": "part1", "name": "過去形", "priority": "A", "weight": 3, "questionCount": 10 },
        { "part": "part2", "name": "過去進行形", "priority": "A", "weight": 3, "questionCount": 10 },
        { "part": "part3", "name": "when 節", "priority": "A", "weight": 3, "questionCount": 10 },
        { "part": "part4", "name": "一般動詞の SVC", "priority": "B", "weight": 2, "questionCount": 10 },
        { "part": "part5", "name": "SVO + to (for)", "priority": "B", "weight": 2, "questionCount": 10 },
        { "part": "part6", "name": "SVOO", "priority": "B", "weight": 2, "questionCount": 10 },
        { "part": "part7", "name": "will（単純未来）", "priority": "A", "weight": 3, "questionCount": 10 },
        { "part": "part8", "name": "will（意志未来）", "priority": "A", "weight": 3, "questionCount": 10 },
        { "part": "part9", "name": "will（依頼）/ shall（申し出・誘い）", "priority": "B", "weight": 2, "questionCount": 10 },
        { "part": "part10", "name": "be going to", "priority": "A", "weight": 3, "questionCount": 10 },
        { "part": "part11", "name": "must / may", "priority": "A", "weight": 3, "questionCount": 10 },
        { "part": "part12", "name": "have to", "priority": "A", "weight": 3, "questionCount": 10 },
        { "part": "part13", "name": "be able to", "priority": "B", "weight": 2, "questionCount": 10 },
        { "part": "part14", "name": "感嘆文", "priority": "B", "weight": 2, "questionCount": 10 },
        { "part": "part15", "name": "不定詞 — 名詞的用法", "priority": "B", "weight": 2, "questionCount": 10 },
        { "part": "part16", "name": "不定詞 — 副詞的用法（目的）", "priority": "A", "weight": 3, "questionCount": 10 },
        { "part": "part17", "name": "不定詞 — 副詞的用法（感情の原因）", "priority": "B", "weight": 2, "questionCount": 10 },
        { "part": "part18", "name": "不定詞 — 形容詞的用法", "priority": "B", "weight": 2, "questionCount": 10 },
        { "part": "part19", "name": "動名詞", "priority": "A", "weight": 3, "questionCount": 10 },
        { "part": "part20", "name": "原級比較", "priority": "A", "weight": 3, "questionCount": 10 },
        { "part": "part21", "name": "比較級 — er 形", "priority": "A", "weight": 3, "questionCount": 10 },
        { "part": "part22", "name": "最上級 — est 形", "priority": "A", "weight": 3, "questionCount": 10 },
        { "part": "part23", "name": "比較級 — more", "priority": "A", "weight": 3, "questionCount": 10 },
        { "part": "part24", "name": "最上級 — most", "priority": "A", "weight": 3, "questionCount": 10 },
        { "part": "part25", "name": "比較級 — 副詞", "priority": "A", "weight": 3, "questionCount": 10 },
        { "part": "part26", "name": "最上級 — 副詞", "priority": "A", "weight": 3, "questionCount": 10 },
        { "part": "part27", "name": "比較級、最上級を使った疑問詞の文", "priority": "A", "weight": 3, "questionCount": 10 },
        { "part": "part28", "name": "現在完了 — 継続", "priority": "B", "weight": 2, "questionCount": 10 },
        { "part": "part29", "name": "現在完了 — 完了", "priority": "B", "weight": 2, "questionCount": 10 },
        { "part": "part30", "name": "現在完了 — 経験", "priority": "B", "weight": 2, "questionCount": 10 },
        { "part": "part31", "name": "現在完了進行形", "priority": "C", "weight": 1, "questionCount": 10 },
        { "part": "part32", "name": "that 節", "priority": "A", "weight": 3, "questionCount": 10 },
        { "part": "part33", "name": "受身 — 1", "priority": "C", "weight": 1, "questionCount": 10 },
        { "part": "part34", "name": "受身 — 2", "priority": "C", "weight": 1, "questionCount": 10 }
      ]
    },
    {
      "unitId": "unit3",
      "title": "Unit 3",
      "description": "中学3年レベルの文法",
      "grade": "junior-high-3",
      "unitNumber": 3,
      "topics": [
        { "part": "part1", "name": "従属節を導く接続詞 — 1", "priority": "A", "weight": 3, "questionCount": 10 },
        { "part": "part2", "name": "従属節を導く接続詞 — 2", "priority": "A", "weight": 3, "questionCount": 10 },
        { "part": "part3", "name": "間接疑問文", "priority": "B", "weight": 2, "questionCount": 10 },
        { "part": "part4", "name": "疑問詞 + to 不定詞", "priority": "B", "weight": 2, "questionCount": 10 },
        { "part": "part5", "name": "形式主語の it", "priority": "B", "weight": 2, "questionCount": 10 },
        { "part": "part6", "name": "SVO + to 不定詞", "priority": "B", "weight": 2, "questionCount": 10 },
        { "part": "part7", "name": "SVOC", "priority": "B", "weight": 2, "questionCount": 10 },
        { "part": "part8", "name": "現在分詞修飾", "priority": "B", "weight": 2, "questionCount": 10 },
        { "part": "part9", "name": "過去分詞修飾", "priority": "B", "weight": 2, "questionCount": 10 },
        { "part": "part10", "name": "関係代名詞・主格（人）", "priority": "B", "weight": 2, "questionCount": 10 },
        { "part": "part11", "name": "関係代名詞・主格（人以外）", "priority": "B", "weight": 2, "questionCount": 10 },
        { "part": "part12", "name": "関係代名詞・所有格 whose と of which", "priority": "C", "weight": 1, "questionCount": 10 },
        { "part": "part13", "name": "関係代名詞・目的格（人）", "priority": "B", "weight": 2, "questionCount": 10 },
        { "part": "part14", "name": "関係代名詞・目的格（人以外）", "priority": "B", "weight": 2, "questionCount": 10 },
        { "part": "part15", "name": "先行詞を含む関係代名詞 what", "priority": "B", "weight": 2, "questionCount": 10 },
        { "part": "part16", "name": "too 〜 to 〜", "priority": "A", "weight": 3, "questionCount": 10 },
        { "part": "part17", "name": "enough 〜 to 〜", "priority": "A", "weight": 3, "questionCount": 10 },
        { "part": "part18", "name": "so 〜 that ⋯", "priority": "A", "weight": 3, "questionCount": 10 },
        { "part": "part19", "name": "原形不定詞・知覚", "priority": "B", "weight": 2, "questionCount": 10 },
        { "part": "part20", "name": "原形不定詞・使役", "priority": "B", "weight": 2, "questionCount": 10 },
        { "part": "part21", "name": "関係副詞・where", "priority": "B", "weight": 2, "questionCount": 10 },
        { "part": "part22", "name": "関係副詞・when", "priority": "B", "weight": 2, "questionCount": 10 }
      ]
    }
  ]
};

// 例文データテンプレート（Essential Grammar in Use スタイル）
const sentenceTemplates = {
  // Unit 1 (中1)
  "this / that": [
    { jp: "これは私のペンです。", en: "This is my pen." },
    { jp: "あれは私の学校です。", en: "That is my school." },
    { jp: "これはあなたの本ですか？", en: "Is this your book?" },
    { jp: "あれは何ですか？", en: "What is that?" },
    { jp: "これは新しい車です。", en: "This is a new car." },
    { jp: "あれは古い建物です。", en: "That is an old building." },
    { jp: "これは私の部屋です。", en: "This is my room." },
    { jp: "あれは彼の家です。", en: "That is his house." },
    { jp: "これは面白い本です。", en: "This is an interesting book." },
    { jp: "あれは大きな木です。", en: "That is a big tree." }
  ],
  "these / those": [
    { jp: "これらは私の本です。", en: "These are my books." },
    { jp: "あれらは彼のノートです。", en: "Those are his notebooks." },
    { jp: "これらはあなたのペンですか？", en: "Are these your pens?" },
    { jp: "あれらは何ですか？", en: "What are those?" },
    { jp: "これらは新しい靴です。", en: "These are new shoes." },
    { jp: "あれらは古い写真です。", en: "Those are old photos." },
    { jp: "これらは私の友達です。", en: "These are my friends." },
    { jp: "あれらは彼の先生たちです。", en: "Those are his teachers." },
    { jp: "これらは美しい花です。", en: "These are beautiful flowers." },
    { jp: "あれらは高い山です。", en: "Those are high mountains." }
  ],
  // 他の文法項目も同様に追加...
};

console.log('Unit例文データ生成スクリプトを実行しています...');
console.log('このスクリプトは現在テンプレートのみです。');
console.log('実際の790問の例文生成にはOpenAI APIを使用することを推奨します。');
