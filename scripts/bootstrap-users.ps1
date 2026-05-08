param(
  [string]$FunctionUrl = "http://127.0.0.1:54321/functions/v1/register_user"
)

function Invoke-WithRetry {
  param(
    [string]$Label,
    [int]$MaxAttempts = 5,
    [int]$DelaySec = 3,
    [scriptblock]$Action
  )

  for ($i = 1; $i -le $MaxAttempts; $i++) {
    try {
      & $Action
      return
    }
    catch {
      if ($i -eq $MaxAttempts) {
        throw "[$Label] fallo tras $MaxAttempts intentos. Error: $($_.Exception.Message)"
      }

      Write-Host "[$Label] intento $i/$MaxAttempts fallo: $($_.Exception.Message)"
      Start-Sleep -Seconds $DelaySec
    }
  }
}

$users = @(
  @{
    email = "juan.guarnizo@gmail.com"
    password = "1234"
    telefono = "+521234567890"
    nombre = "Juan"
    apellido = "Guarnizo"
    fecha_nacimiento = "1990-01-01"
    sobre_mi = "Usuario administrador inicial del sistema."
    jornada = 8
    id_zona_horaria = 1
    id_rol_global = 1
  }
)

foreach ($user in $users) {
  $body = $user | ConvertTo-Json -Depth 5

  Invoke-WithRetry -Label "Crear usuario $($user.email)" -Action {
    Invoke-RestMethod `
      -Method POST `
      -Uri $FunctionUrl `
      -ContentType "application/json" `
      -Body $body `
      -TimeoutSec 30 `
      -ErrorAction Stop | Out-Null
  }
}