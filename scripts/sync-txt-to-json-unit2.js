const fs = require('fs');

// テキストファイルをパース
const txt = fs.readFileSync('data/unit2_sentences.txt', 'utf-8');
const lines = txt.split('\n');

const sentences = {};
let currentId = null;
let currentTags = [];

for (const line of lines) {
  const idMatch = line.match(/^(unit2-p\d+-s\d+)\s+Tags:\s*(.+)/);
  if (idMatch) {
    currentId = idMatch[1];
    currentTags = [idMatch[2].trim()];
    continue;
  }
  if (currentId && line.startsWith('JP: ')) {
    if (!sentences[currentId]) sentences[currentId] = {};
    sentences[currentId].jp = line.substring(4);
  }
  if (currentId && line.startsWith('EN: ')) {
    if (!sentences[currentId]) sentences[currentId] = {};
    sentences[currentId].en = line.substring(4);
    sentences[currentId].tags = currentTags;
  }
}

console.log('Parsed sentences from txt:', Object.keys(sentences).length);

// JSON読み込み
const json = JSON.parse(fs.readFileSync('data/units/junior-high-2/unit2.json', 'utf-8'));

let updated = 0;
let unchanged = 0;

for (const part of json.parts) {
  for (const s of part.sentences) {
    const txtData = sentences[s.id];
    if (!txtData) {
      console.log('NOT FOUND in txt:', s.id);
      continue;
    }
    if (s.jp !== txtData.jp || s.en !== txtData.en) {
      console.log('UPDATE:', s.id);
      s.jp = txtData.jp;
      s.en = txtData.en;
      s.tags = txtData.tags;
      updated++;
    } else {
      unchanged++;
    }
  }
}

console.log('\nUpdated:', updated, 'Unchanged:', unchanged);

// JSON書き込み
fs.writeFileSync('data/units/junior-high-2/unit2.json', JSON.stringify(json, null, 2), 'utf-8');
console.log('JSON written successfully');
