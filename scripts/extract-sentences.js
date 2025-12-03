const fs = require('fs');
const path = require('path');

// Unitデータのディレクトリ
const UNITS_DIR = path.join(__dirname, '..', 'data', 'units');
const OUTPUT_FILE = path.join(__dirname, '..', 'sentences-export.txt');

// すべてのJSONファイルを読み込む
function getAllUnitFiles(dir) {
  const files = [];

  function scan(currentDir) {
    const items = fs.readdirSync(currentDir);

    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scan(fullPath);
      } else if (item.endsWith('.json')) {
        files.push(fullPath);
      }
    }
  }

  scan(dir);
  return files;
}

// メイン処理
function extractSentences() {
  const unitFiles = getAllUnitFiles(UNITS_DIR);
  let output = '';

  console.log(`Found ${unitFiles.length} unit files`);

  // ファイルごとに処理
  unitFiles.forEach((filePath) => {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    output += `# ${data.title} - ${data.description}\n`;
    output += `# Grade: ${data.grade}, Unit Number: ${data.unitNumber}\n`;
    output += `# File: ${path.relative(UNITS_DIR, filePath)}\n\n`;

    // Partごとに処理
    data.parts.forEach((part) => {
      output += `## Part ${part.partNumber}: ${part.title}\n`;
      output += `## ${part.description}\n`;
      output += `## Priority: ${part.priority || 'N/A'}\n\n`;

      // 例文を出力
      part.sentences.forEach((sentence) => {
        output += `[${sentence.id}]\n`;
        output += `JP: ${sentence.jp}\n`;
        output += `EN: ${sentence.en}\n`;
        output += `Tags: ${sentence.tags.join(', ')}\n`;
        output += `Level: ${sentence.level}\n`;
        output += `\n`;
      });

      output += `\n`;
    });

    output += `\n${'='.repeat(80)}\n\n`;
  });

  // ファイルに保存
  fs.writeFileSync(OUTPUT_FILE, output, 'utf-8');
  console.log(`\nSentences exported to: ${OUTPUT_FILE}`);
  console.log(`Total output size: ${output.length} characters`);
}

// 実行
extractSentences();
