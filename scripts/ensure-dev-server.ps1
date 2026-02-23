param(
  [int]$Port = 3000,
  [int]$MaxAttempts = 120,
  [int]$DelayMs = 500
)

$root = Split-Path -Parent $PSScriptRoot
$uri = "http://localhost:$Port"

function Test-PortOpen {
  if (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue) {
    $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    return $null -ne $listener
  }
  if (Get-Command Test-NetConnection -ErrorAction SilentlyContinue) {
    return Test-NetConnection -ComputerName "127.0.0.1" -Port $Port -InformationLevel Quiet
  }
  return $false
}

function Test-HttpReady {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $uri -TimeoutSec 2
    return ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500)
  } catch {
    return $false
  }
}

function Start-DevServer {
  $npmCmd = Get-Command npm -ErrorAction SilentlyContinue
  if (-not $npmCmd) {
    $npmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
  }
  if (-not $npmCmd) {
    Write-Error "npm not found in PATH. Install Node.js or restart VSCode."
    exit 1
  }

  Start-Process -FilePath $npmCmd.Source -ArgumentList "run", "dev" -WorkingDirectory $root -WindowStyle Hidden
}

if (-not (Test-PortOpen)) {
  Start-DevServer
}

for ($i = 0; $i -lt $MaxAttempts; $i++) {
  if (Test-HttpReady) {
    exit 0
  }
  Start-Sleep -Milliseconds $DelayMs
}

Write-Error "Next.js dev server not ready: $uri"
exit 1
