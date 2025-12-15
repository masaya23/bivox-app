const fs = require('fs');
const path = require('path');

// unit1.jsonを読み込む
const unit1Path = path.join(__dirname, '../data/units/junior-high-1/unit1.json');
const unit1Data = JSON.parse(fs.readFileSync(unit1Path, 'utf-8'));

// 優先度を割り当てる（Part 1-8はA、Part 9-16はB、Part 17-24はC）
const getPriority = (partNumber) => {
  if (partNumber <= 8) return 'A';
  if (partNumber <= 16) return 'B';
  return 'C';
};

// 各Partにpartnumberとpriorityを追加
unit1Data.parts = unit1Data.parts.map((part, index) => {
  const partNumber = index + 1;
  return {
    ...part,
    partNumber,
    priority: getPriority(partNumber),
  };
});

// ファイルに書き戻す
fs.writeFileSync(unit1Path, JSON.stringify(unit1Data, null, 2), 'utf-8');

console.log('✓ unit1.json structure fixed!');
console.log(`  - Added grade: ${unit1Data.grade}`);
console.log(`  - Added unitNumber: ${unit1Data.unitNumber}`);
console.log(`  - Added description: ${unit1Data.description}`);
console.log(`  - Updated ${unit1Data.parts.length} parts with partNumber and priority`);
