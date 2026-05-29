const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const backupRoot = path.join(projectRoot, '.cap-build-backup');
const targets = [
  {
    source: path.join(projectRoot, 'app', 'api'),
    backup: path.join(backupRoot, 'app-api'),
    label: 'app/api',
  },
  {
    source: path.join(projectRoot, 'middleware.ts'),
    backup: path.join(backupRoot, 'middleware.ts'),
    label: 'middleware.ts',
  },
];

console.log('Capacitor build starting...');
console.log('Project root:', projectRoot);

if (!fs.existsSync(backupRoot)) {
  fs.mkdirSync(backupRoot, { recursive: true });
}

const movedTargets = [];

const moveToBackup = (target) => {
  if (!fs.existsSync(target.source)) {
    console.log(`Skipping ${target.label}; not found.`);
    return;
  }

  if (fs.existsSync(target.backup)) {
    throw new Error(`Backup path already exists for ${target.label}: ${target.backup}`);
  }

  console.log(`Temporarily moving ${target.label}...`);
  fs.renameSync(target.source, target.backup);
  movedTargets.push(target);
  console.log(`${target.label} moved successfully.`);
};

const restoreFromBackup = () => {
  for (const target of movedTargets.reverse()) {
    if (!fs.existsSync(target.backup)) {
      continue;
    }

    console.log(`Restoring ${target.label}...`);
    fs.renameSync(target.backup, target.source);
    console.log(`${target.label} restored.`);
  }

  if (fs.existsSync(backupRoot) && fs.readdirSync(backupRoot).length === 0) {
    fs.rmdirSync(backupRoot);
  }
};

try {
  for (const target of targets) {
    moveToBackup(target);
  }

  console.log('Running Next.js build with static export...');
  execSync('next build', {
    cwd: projectRoot,
    stdio: 'inherit',
    env: { ...process.env, BUILD_TARGET: 'capacitor' },
  });

  console.log('Build completed successfully!');
} catch (err) {
  console.error('Capacitor build failed.');
  if (err instanceof Error) {
    console.error(err.message);
  }
  restoreFromBackup();
  process.exit(1);
}

restoreFromBackup();

console.log('Capacitor build finished!');
