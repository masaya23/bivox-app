/**
 * 全問題のMP3音声ファイルを事前生成するスクリプト
 *
 * 使用方法:
 *   node scripts/generate-audio.js
 *
 * 環境変数:
 *   OPENAI_API_KEY - OpenAI APIキー
 */

const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

// .env.local から環境変数を読み込む
require('dotenv').config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const AUDIO_DIR = path.join(__dirname, '..', 'public', 'audio');
const DATA_DIR = path.join(__dirname, '..', 'data', 'units');

// 音声生成の設定
const TTS_CONFIG = {
  model: 'gpt-4o-mini-tts',
  voice: 'alloy',
  speed: 1.0,
};

// ディレクトリ作成
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
}

// すべてのUnitデータを読み込む
function loadAllUnits() {
  const units = [];
  const gradesDirs = ['junior-high-1', 'junior-high-2', 'junior-high-3'];

  for (const grade of gradesDirs) {
    const gradeDir = path.join(DATA_DIR, grade);
    if (!fs.existsSync(gradeDir)) continue;

    const files = fs.readdirSync(gradeDir);
    for (const file of files) {
      // バックアップファイルをスキップ
      if (file.includes('backup') || file.includes('old')) continue;
      if (!file.endsWith('.json')) continue;

      const filePath = path.join(gradeDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      units.push(data);
    }
  }

  return units;
}

// 音声ファイルを生成
async function generateAudio(text, lang, outputPath) {
  // 既に存在する場合はスキップ
  if (fs.existsSync(outputPath)) {
    return { skipped: true };
  }

  try {
    const mp3 = await openai.audio.speech.create({
      model: TTS_CONFIG.model,
      voice: TTS_CONFIG.voice,
      input: text,
      speed: TTS_CONFIG.speed,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);

    return { success: true, size: buffer.length };
  } catch (error) {
    console.error(`Error generating audio for "${text.substring(0, 30)}...":`, error.message);
    return { error: error.message };
  }
}

// メイン処理
async function main() {
  console.log('=== MP3音声ファイル生成スクリプト ===\n');

  // APIキーチェック
  if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY が設定されていません');
    console.error('.env.local ファイルに OPENAI_API_KEY を設定してください');
    process.exit(1);
  }

  // ディレクトリ作成
  ensureDir(path.join(AUDIO_DIR, 'ja'));
  ensureDir(path.join(AUDIO_DIR, 'en'));

  // データ読み込み
  const units = loadAllUnits();
  console.log(`読み込んだUnit数: ${units.length}`);

  // 全センテンスをカウント
  let totalSentences = 0;
  for (const unit of units) {
    for (const part of unit.parts || []) {
      totalSentences += (part.sentences || []).length;
    }
  }
  console.log(`総センテンス数: ${totalSentences}`);
  console.log(`生成予定ファイル数: ${totalSentences * 2} (日本語 + 英語)\n`);

  let processed = 0;
  let generated = 0;
  let skipped = 0;
  let errors = 0;

  // 各センテンスの音声を生成
  for (const unit of units) {
    console.log(`\n--- ${unit.title} ---`);

    for (const part of unit.parts || []) {
      console.log(`  ${part.title}`);

      for (const sentence of part.sentences || []) {
        processed++;
        const progress = `[${processed}/${totalSentences * 2}]`;

        // 日本語音声
        const jaPath = path.join(AUDIO_DIR, 'ja', `${sentence.id}.mp3`);
        const jaResult = await generateAudio(sentence.jp, 'ja', jaPath);

        if (jaResult.skipped) {
          skipped++;
          process.stdout.write(`${progress} ${sentence.id} (ja) - skipped\r`);
        } else if (jaResult.success) {
          generated++;
          console.log(`${progress} ${sentence.id} (ja) - generated (${jaResult.size} bytes)`);
          // APIレート制限対策で少し待機
          await new Promise(r => setTimeout(r, 100));
        } else {
          errors++;
          console.log(`${progress} ${sentence.id} (ja) - ERROR: ${jaResult.error}`);
        }

        processed++;

        // 英語音声
        const enPath = path.join(AUDIO_DIR, 'en', `${sentence.id}.mp3`);
        const enResult = await generateAudio(sentence.en, 'en', enPath);

        if (enResult.skipped) {
          skipped++;
          process.stdout.write(`${progress} ${sentence.id} (en) - skipped\r`);
        } else if (enResult.success) {
          generated++;
          console.log(`${progress} ${sentence.id} (en) - generated (${enResult.size} bytes)`);
          // APIレート制限対策で少し待機
          await new Promise(r => setTimeout(r, 100));
        } else {
          errors++;
          console.log(`${progress} ${sentence.id} (en) - ERROR: ${enResult.error}`);
        }
      }
    }
  }

  console.log('\n\n=== 完了 ===');
  console.log(`生成: ${generated} ファイル`);
  console.log(`スキップ（既存）: ${skipped} ファイル`);
  console.log(`エラー: ${errors} ファイル`);
}

main().catch(console.error);
