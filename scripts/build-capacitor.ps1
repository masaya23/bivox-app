# Capacitorビルド用スクリプト
# APIルートを一時的に退避してビルド

$projectRoot = "C:\programming\englishapp"
$apiPath = "$projectRoot\app\api"
$apiBakPath = "$projectRoot\app\api_disabled"

Write-Host "Capacitor build starting..."

# 1. APIフォルダを退避
if (Test-Path $apiPath) {
    Write-Host "Moving API folder to api_disabled..."
    Rename-Item -Path $apiPath -NewName "api_disabled" -Force
}

# 2. 環境変数を設定してビルド
Write-Host "Running Next.js build with static export..."
$env:BUILD_TARGET = "capacitor"

Set-Location $projectRoot
npm run build
$buildResult = $LASTEXITCODE

# 3. APIフォルダを復元
if (Test-Path $apiBakPath) {
    Write-Host "Restoring API folder..."
    Rename-Item -Path $apiBakPath -NewName "api" -Force
}

if ($buildResult -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Capacitor build finished!"
