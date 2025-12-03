/**
 * 全Unit JSONファイルに優先度情報を追加するスクリプト
 */

const fs = require('fs');
const path = require('path');

// 優先度マッピング（ユーザー提供の設定から）
const priorityConfig = {
  unit1: [
    { part: 1, priority: "A", weight: 3 }, // be動詞
    { part: 2, priority: "A", weight: 3 }, // this / that
    { part: 3, priority: "A", weight: 3 }, // these / those
    { part: 4, priority: "A", weight: 3 }, // What is (are) 〜 ?
    { part: 5, priority: "A", weight: 3 }, // 人称代名詞の主格
    { part: 6, priority: "A", weight: 3 }, // 人称代名詞の所有格
    { part: 7, priority: "A", weight: 3 }, // Who is (are) 〜 ?
    { part: 8, priority: "A", weight: 3 }, // 一般動詞
    { part: 9, priority: "A", weight: 3 }, // how many (much) 〜
    { part: 10, priority: "A", weight: 3 }, // 人称代名詞の目的格
    { part: 11, priority: "B", weight: 2 }, // 人称代名詞の独立所有格
    { part: 12, priority: "A", weight: 3 }, // 命令文 / Let's 〜
    { part: 13, priority: "B", weight: 2 }, // whose
    { part: 14, priority: "A", weight: 3 }, // where
    { part: 15, priority: "A", weight: 3 }, // when
    { part: 16, priority: "B", weight: 2 }, // which
    { part: 17, priority: "A", weight: 3 }, // it
    { part: 18, priority: "A", weight: 3 }, // What time 〜 ?
    { part: 19, priority: "A", weight: 3 }, // how
    { part: 20, priority: "A", weight: 3 }, // How old (tall) 〜 ?
    { part: 21, priority: "B", weight: 2 }, // 疑問詞主語の who
    { part: 22, priority: "A", weight: 3 }, // can
    { part: 23, priority: "A", weight: 3 }, // 現在進行形
    { part: 24, priority: "A", weight: 3 }  // There is (are) 〜
  ],
  unit2: [
    { part: 1, priority: "A", weight: 3 }, // 過去形
    { part: 2, priority: "A", weight: 3 }, // 過去進行形
    { part: 3, priority: "A", weight: 3 }, // when 節
    { part: 4, priority: "B", weight: 2 }, // 一般動詞の SVC
    { part: 5, priority: "B", weight: 2 }, // SVO + to (for)
    { part: 6, priority: "B", weight: 2 }, // SVOO
    { part: 7, priority: "A", weight: 3 }, // will（単純未来）
    { part: 8, priority: "A", weight: 3 }, // will（意志未来）
    { part: 9, priority: "B", weight: 2 }, // will（依頼）/ shall（申し出・誘い）
    { part: 10, priority: "A", weight: 3 }, // be going to
    { part: 11, priority: "A", weight: 3 }, // must / may
    { part: 12, priority: "A", weight: 3 }, // have to
    { part: 13, priority: "B", weight: 2 }, // be able to
    { part: 14, priority: "B", weight: 2 }, // 感嘆文
    { part: 15, priority: "B", weight: 2 }, // 不定詞 — 名詞的用法
    { part: 16, priority: "A", weight: 3 }, // 不定詞 — 副詞的用法（目的）
    { part: 17, priority: "B", weight: 2 }, // 不定詞 — 副詞的用法（感情の原因）
    { part: 18, priority: "B", weight: 2 }, // 不定詞 — 形容詞的用法
    { part: 19, priority: "A", weight: 3 }, // 動名詞
    { part: 20, priority: "A", weight: 3 }, // 原級比較
    { part: 21, priority: "A", weight: 3 }, // 比較級 — er 形
    { part: 22, priority: "A", weight: 3 }, // 最上級 — est 形
    { part: 23, priority: "A", weight: 3 }, // 比較級 — more
    { part: 24, priority: "A", weight: 3 }, // 最上級 — most
    { part: 25, priority: "A", weight: 3 }, // 比較級 — 副詞
    { part: 26, priority: "A", weight: 3 }, // 最上級 — 副詞
    { part: 27, priority: "A", weight: 3 }, // 比較級、最上級を使った疑問詞の文
    { part: 28, priority: "B", weight: 2 }, // 現在完了 — 継続
    { part: 29, priority: "B", weight: 2 }, // 現在完了 — 完了
    { part: 30, priority: "B", weight: 2 }, // 現在完了 — 経験
    { part: 31, priority: "C", weight: 1 }, // 現在完了進行形
    { part: 32, priority: "A", weight: 3 }, // that 節
    { part: 33, priority: "C", weight: 1 }, // 受身 — 1
    { part: 34, priority: "C", weight: 1 }  // 受身 — 2
  ],
  unit3: [
    { part: 1, priority: "A", weight: 3 }, // 従属節を導く接続詞 — 1
    { part: 2, priority: "A", weight: 3 }, // 従属節を導く接続詞 — 2
    { part: 3, priority: "B", weight: 2 }, // 間接疑問文
    { part: 4, priority: "B", weight: 2 }, // 疑問詞 + to 不定詞
    { part: 5, priority: "B", weight: 2 }, // 形式主語の it
    { part: 6, priority: "B", weight: 2 }, // SVO + to 不定詞
    { part: 7, priority: "B", weight: 2 }, // SVOC
    { part: 8, priority: "B", weight: 2 }, // 現在分詞修飾
    { part: 9, priority: "B", weight: 2 }, // 過去分詞修飾
    { part: 10, priority: "B", weight: 2 }, // 関係代名詞・主格（人）
    { part: 11, priority: "B", weight: 2 }, // 関係代名詞・主格（人以外）
    { part: 12, priority: "C", weight: 1 }, // 関係代名詞・所有格 whose と of which
    { part: 13, priority: "B", weight: 2 }, // 関係代名詞・目的格（人）
    { part: 14, priority: "B", weight: 2 }, // 関係代名詞・目的格（人以外）
    { part: 15, priority: "B", weight: 2 }, // 先行詞を含む関係代名詞 what
    { part: 16, priority: "A", weight: 3 }, // too 〜 to 〜
    { part: 17, priority: "A", weight: 3 }, // enough 〜 to 〜
    { part: 18, priority: "A", weight: 3 }, // so 〜 that ⋯
    { part: 19, priority: "B", weight: 2 }, // 原形不定詞・知覚
    { part: 20, priority: "B", weight: 2 }, // 原形不定詞・使役
    { part: 21, priority: "B", weight: 2 }, // 関係副詞・where
    { part: 22, priority: "B", weight: 2 }  // 関係副詞・when
  ]
};

function addPrioritiesToUnit(unitId, unitPath) {
  console.log(`\n${unitId}に優先度情報を追加中...`);

  const unitData = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));
  const priorities = priorityConfig[unitId];

  // 各Partに優先度情報を追加
  unitData.parts = unitData.parts.map((part) => {
    const priorityInfo = priorities.find(p => p.part === part.partNumber);

    if (!priorityInfo) {
      console.warn(`  警告: Part ${part.partNumber} の優先度情報が見つかりません`);
      return part;
    }

    return {
      ...part,
      priority: priorityInfo.priority,
      weight: priorityInfo.weight
    };
  });

  // ファイルに保存
  fs.writeFileSync(unitPath, JSON.stringify(unitData, null, 2), 'utf-8');
  console.log(`✓ ${unitId}に優先度情報を追加しました`);
  console.log(`  パート数: ${unitData.parts.length}`);
}

function main() {
  console.log('============================================================');
  console.log('全UnitのJSONファイルに優先度情報を追加します');
  console.log('============================================================');

  const units = [
    { id: 'unit1', path: path.join(__dirname, '..', 'data', 'units', 'junior-high-1', 'unit1.json') },
    { id: 'unit2', path: path.join(__dirname, '..', 'data', 'units', 'junior-high-2', 'unit2.json') },
    { id: 'unit3', path: path.join(__dirname, '..', 'data', 'units', 'junior-high-3', 'unit3.json') }
  ];

  units.forEach(unit => {
    addPrioritiesToUnit(unit.id, unit.path);
  });

  console.log('\n============================================================');
  console.log('優先度情報の追加が完了しました！');
  console.log('============================================================');
}

main();
