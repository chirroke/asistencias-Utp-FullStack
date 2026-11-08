$ErrorActionPreference = 'Stop'

$psqlCommand = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlCommand) {
    throw 'No encuentro psql en PATH. Instala o agrega PostgreSQL 18 (psql.exe) y vuelve a ejecutar este script.'
}
$psql = $psqlCommand.Source
$versionText = (& $psql --version | Out-String).Trim()
if ($versionText -notmatch '([0-9]+)\.([0-9]+)') {
    throw "No pude identificar la version de psql: $versionText"
}
if ([int]$Matches[1] -lt 18) {
    throw "Este esquema fue exportado con PostgreSQL 18; usa psql 18. Version encontrada: $versionText"
}

$dbHost = Read-Host 'Host externo de PostgreSQL (Render > Connect > External URL, solo el host)'
$dbPort = Read-Host 'Puerto (normalmente 5432)'
$dbName = Read-Host 'Nombre de base de datos'
$dbUser = Read-Host 'Usuario de base de datos'
$securePassword = Read-Host 'Contrasena de la base (no se mostrara)' -AsSecureString
$dbPassword = [System.Net.NetworkCredential]::new('', $securePassword).Password

if ([string]::IsNullOrWhiteSpace($dbHost) -or [string]::IsNullOrWhiteSpace($dbPort) -or
    [string]::IsNullOrWhiteSpace($dbName) -or [string]::IsNullOrWhiteSpace($dbUser)) {
    throw 'Falta completar host, puerto, base o usuario.'
}

$schemaFile = Join-Path $PSScriptRoot 'database\schema.sql'
$migrationFile = Join-Path $PSScriptRoot 'database\migrations\006_reprogramacion.sql'
$seedFile = Join-Path $PSScriptRoot 'database\demo-seed.sql'
$env:PGPASSWORD = $dbPassword
$env:PGSSLMODE = 'require'
$dbPassword = $null

try {
    $commonArgs = @('-X', '-w', '-h', $dbHost, '-p', $dbPort, '-U', $dbUser, '-d', $dbName)
    $exists = (& $psql @commonArgs '-tA' '-c' "SELECT to_regclass('public.usuario') IS NOT NULL;").Trim()
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo conectar a PostgreSQL. Revisa los datos de conexion.' }
    if ($exists -eq 't') { throw 'La base ya contiene public.usuario. Usa una base Render nueva y vacia; no se borraran ni reemplazaran tablas.' }

    Write-Host 'Aplicando el esquema vacio...'
    & $psql @commonArgs '-v' 'ON_ERROR_STOP=1' '-f' $schemaFile
    if ($LASTEXITCODE -ne 0) { throw 'Falló la carga del esquema.' }

    Write-Host 'Aplicando la migracion de reprogramacion...'
    & $psql @commonArgs '-v' 'ON_ERROR_STOP=1' '-f' $migrationFile
    if ($LASTEXITCODE -ne 0) { throw 'Falló la migracion 006.' }

    Write-Host 'Creando cuentas y cursos sinteticos...'
    & $psql @commonArgs '-v' 'ON_ERROR_STOP=1' '-f' $seedFile
    if ($LASTEXITCODE -ne 0) { throw 'Falló la carga de los datos sinteticos.' }

    Write-Host 'Listo. La base contiene solo el esquema y las cuentas sinteticas de demostracion.'
}
finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:PGSSLMODE -ErrorAction SilentlyContinue
    $securePassword.Dispose()
    $dbPassword = $null
}
