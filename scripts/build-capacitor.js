const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const apiPath = path.join(projectRoot, 'app', 'api');
const apiBakPath = path.join(projectRoot, 'app', '_api_backup');

console.log('Capacitor build starting...');
console.log('Project root:', projectRoot);

let apiMoved = false;

// 1. APIフォルダを退避
if (fs.existsSync(apiPath)) {
    console.log('Moving API folder to api_disabled...');
    try {
        fs.renameSync(apiPath, apiBakPath);
        apiMoved = true;
        console.log('API folder moved successfully');
    } catch (err) {
        console.error('Failed to move API folder:', err.message);
        console.log('Trying alternative method...');

        // 代替: フォルダをコピーしてから削除
        try {
            fs.cpSync(apiPath, apiBakPath, { recursive: true });
            fs.rmSync(apiPath, { recursive: true, force: true });
            apiMoved = true;
            console.log('API folder moved using copy+delete');
        } catch (err2) {
            console.error('Alternative method also failed:', err2.message);
            process.exit(1);
        }
    }
}

// 2. ビルド実行
console.log('Running Next.js build with static export...');
try {
    execSync('npm run build', {
        cwd: projectRoot,
        stdio: 'inherit',
        env: { ...process.env, BUILD_TARGET: 'capacitor' }
    });
    console.log('Build completed successfully!');
} catch (err) {
    console.error('Build failed!');
    // APIフォルダを復元してから終了
    if (apiMoved && fs.existsSync(apiBakPath)) {
        console.log('Restoring API folder...');
        fs.renameSync(apiBakPath, apiPath);
    }
    process.exit(1);
}

// 3. APIフォルダを復元
if (apiMoved && fs.existsSync(apiBakPath)) {
    console.log('Restoring API folder...');
    try {
        fs.renameSync(apiBakPath, apiPath);
        console.log('API folder restored');
    } catch (err) {
        console.error('Failed to restore API folder:', err.message);
    }
}

console.log('Capacitor build finished!');
