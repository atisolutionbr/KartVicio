$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
docker compose up -d --wait db
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível iniciar o PostgreSQL. Abra o Docker Desktop e tente novamente.' }
try {
    $response = Invoke-WebRequest -Uri 'http://localhost:6300/' -TimeoutSec 5
    if ($response.Content -match 'KartVicio') {
        Write-Host 'KartVicio já está disponível: http://localhost:6300'
        return
    }
    throw 'A porta 6300 está ocupada por outro serviço.'
} catch {
    if ($_.Exception.Message -match 'ocupada') { throw }
}
if (-not (Test-Path -LiteralPath 'dist/index.html')) {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'A compilação falhou.' }
}
$nodeExe = (Get-Command node).Source
Start-Process -FilePath $nodeExe -ArgumentList 'server/index.mjs' -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $PSScriptRoot 'private-data/server.log') -RedirectStandardError (Join-Path $PSScriptRoot 'private-data/server-error.log')
for ($attempt = 0; $attempt -lt 60; $attempt++) {
    try {
        $response = Invoke-WebRequest -Uri 'http://localhost:6300/' -TimeoutSec 2
        if ($response.Content -match 'KartVicio') {
            Write-Host 'KartVicio disponível: http://localhost:6300'
            return
        }
    } catch { Start-Sleep -Seconds 1 }
}
throw 'O servidor não respondeu. Consulte private-data/server-error.log.'
