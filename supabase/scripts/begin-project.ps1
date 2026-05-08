$ErrorActionPreference = 'Stop'
$SupabaseProjectId = "supabase_jixology"

function Find-RepoRoot {
  param([string]$StartDir)

  $current = (Resolve-Path $StartDir).Path

  while ($true) {
    $hasSupabase = Test-Path (Join-Path $current 'supabase')
    $hasClient = Test-Path (Join-Path $current 'client')
    $hasScripts = Test-Path (Join-Path $current 'scripts')

    if ($hasSupabase -and $hasClient -and $hasScripts) {
      return $current
    }

    $parent = Split-Path $current -Parent
    if ($parent -eq $current) {
      throw "No se pudo encontrar el root del repo empezando desde: $StartDir"
    }

    $current = $parent
  }
}

function Invoke-Step {
  param(
    [string]$Label,
    [scriptblock]$Action
  )

  Write-Host "== $Label =="
  $global:LASTEXITCODE = 0

  try {
    & $Action

    if ($LASTEXITCODE -ne 0) {
      throw "$Label fallo con codigo $LASTEXITCODE"
    }
  }
  catch {
    throw "$Label fallo. $($_.Exception.Message)"
  }
}

function Invoke-WithRetry {
  param(
    [string]$Label,
    [int]$MaxAttempts = 3,
    [int]$DelaySec = 8,
    [scriptblock]$Action
  )

  for ($i = 1; $i -le $MaxAttempts; $i++) {
    try {
      Write-Host "== $Label (intento $i/$MaxAttempts) =="
      $global:LASTEXITCODE = 0

      & $Action

      if ($LASTEXITCODE -ne 0) {
        throw "$Label fallo con codigo $LASTEXITCODE"
      }

      return
    }
    catch {
      if ($i -eq $MaxAttempts) {
        throw "$Label fallo tras $MaxAttempts intentos. $($_.Exception.Message)"
      }

      Write-Host "[$Label] intento $i fallo: $($_.Exception.Message)"
      Start-Sleep -Seconds $DelaySec
    }
  }
}

function Remove-StaleSupabaseContainers {
  param(
    [string]$ProjectId
  )

  $patterns = @(
    "supabase_kong_$ProjectId",
    "supabase_auth_$ProjectId",
    "supabase_rest_$ProjectId",
    "supabase_realtime_$ProjectId",
    "supabase_storage_$ProjectId",
    "supabase_imgproxy_$ProjectId",
    "supabase_meta_$ProjectId",
    "supabase_studio_$ProjectId",
    "supabase_inbucket_$ProjectId",
    "supabase_vector_$ProjectId",
    "supabase_db_$ProjectId",
    "supabase_pooler_$ProjectId"
  )

  foreach ($name in $patterns) {
    $existing = docker ps -aq --filter "name=^/${name}$"
    if ($existing) {
      Write-Host "Eliminando contenedor huerfano: $name"
      docker rm -f $name | Out-Null
    }
  }
}

function Test-FunctionReady {
  param(
    [string]$FunctionName,
    [int]$TimeoutSec = 5
  )

  $url = "http://127.0.0.1:54321/functions/v1/$FunctionName"

  try {
    $response = Invoke-WebRequest `
      -Uri $url `
      -Method Get `
      -TimeoutSec $TimeoutSec `
      -UseBasicParsing `
      -ErrorAction Stop

    return $response.StatusCode -eq 200
  }
  catch {
    return $false
  }
}

$scriptDir = $PSScriptRoot
$repoRoot = Find-RepoRoot -StartDir $scriptDir
$bootstrapPath = Join-Path $repoRoot 'scripts\bootstrap-users.ps1'
$postBootstrapSeedPath = Join-Path $repoRoot 'client\scripts\post-bootstrap-seed.mjs'
$SupabaseCmd = Join-Path $scriptDir '..\node_modules\.bin\supabase.cmd'


if (-not (Test-Path $bootstrapPath)) {
  throw "No existe bootstrap-users.ps1 en: $bootstrapPath"
}

if (-not (Test-Path $postBootstrapSeedPath)) {
  throw "No existe post-bootstrap-seed.mjs en: $postBootstrapSeedPath"
}

if (-not (Test-Path $SupabaseCmd)) {
  throw "No se encontro el Supabase CLI local en: $SupabaseCmd"
}

$requiredFunctions = @(
  "register_user"
)

$tmpDir = Join-Path $repoRoot 'tmp'
New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null

$stdoutLog = Join-Path $tmpDir 'functions.stdout.log'
$stderrLog = Join-Path $tmpDir 'functions.stderr.log'

Write-Host "Repo root detectado en: $repoRoot"
Write-Host "Bootstrap path: $bootstrapPath"
Write-Host "Post-bootstrap seed path: $postBootstrapSeedPath"
Write-Host "Supabase CLI: $SupabaseCmd"
Write-Host "Functions requeridas: $($requiredFunctions -join ', ')"

Push-Location $repoRoot
$functionProcess = $null

try {
  Write-Host "== Deteniendo Supabase local (si ya estaba corriendo) =="
  try {
    & $SupabaseCmd stop
  } catch {
    Write-Host "Supabase no estaba corriendo o no se pudo detener limpiamente. Continuando..."
  }

  Remove-StaleSupabaseContainers -ProjectId $SupabaseProjectId

  Invoke-Step "Iniciando Supabase local" {
    & $SupabaseCmd start
  }

  Start-Sleep -Seconds 5

  Invoke-WithRetry "Reseteando DB local" -MaxAttempts 3 -DelaySec 8 -Action {
    & $SupabaseCmd db reset --local
  }

  Write-Host "== Levantando Edge Functions locales =="
  $functionProcess = Start-Process `
    -FilePath $SupabaseCmd `
    -ArgumentList @("functions", "serve") `
    -WorkingDirectory $repoRoot `
    -PassThru `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog `
    -WindowStyle Hidden

  foreach ($fn in $requiredFunctions) {
    Write-Host "== Esperando a que $fn este lista =="

    $maxAttempts = 45
    $attempt = 0
    $ready = $false

    while (-not $ready -and $attempt -lt $maxAttempts) {
      $attempt++

      if (Test-FunctionReady -FunctionName $fn -TimeoutSec 5) {
        $ready = $true
        break
      }

      Write-Host "Intento ${attempt}/${maxAttempts}: $fn aun no esta lista..."
      Start-Sleep -Seconds 2
    }

    if (-not $ready) {
      throw "La Edge Function $fn no quedo lista a tiempo. Revisa: $stderrLog"
    }
  }

  Invoke-Step "Ejecutando bootstrap de usuarios" {
    & $bootstrapPath -FunctionUrl "http://127.0.0.1:54321/functions/v1/register_user"
  }

  Invoke-Step "Ejecutando post-bootstrap seed" {
    node $postBootstrapSeedPath
  }

  Write-Host "[ps1] Setup local completado correctamente."
}
finally {
  Pop-Location

  if ($functionProcess -and -not $functionProcess.HasExited) {
    cmd /c "taskkill /PID $($functionProcess.Id) /T /F" | Out-Null
  }
}