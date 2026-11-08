param([switch]$Demo)
$ErrorActionPreference='Stop'
$workspace=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$portable=Join-Path $workspace '.tools/java'
if(Test-Path -LiteralPath $portable){$java=(Get-ChildItem -LiteralPath $portable -Directory | Select-Object -First 1).FullName+'/bin/java.exe'}
else {$java=(Get-Command java -ErrorAction Stop).Source}
$config=Join-Path $PSScriptRoot '.env.local'
if(!(Test-Path -LiteralPath $config)){throw 'Copia .env.example a .env.local y configura la conexión antes de iniciar.'}
foreach($line in Get-Content -LiteralPath $config){if($line -match '^([A-Z][A-Z0-9_]*)=(.*)$'){[Environment]::SetEnvironmentVariable($Matches[1],$Matches[2],'Process')}}
if($Demo){
    $data=Join-Path $workspace '.tools/pgdata'
    $pg='C:/Program Files/PostgreSQL/18/bin/pg_ctl.exe'
    if(!(Test-Path -LiteralPath $data)){throw 'No se encuentra la base local aislada preparada para esta laptop.'}
    & $pg -D $data status *> $null
    if($LASTEXITCODE -ne 0){
        $pidFile=Join-Path $data 'postmaster.pid'
        if(Test-Path -LiteralPath $pidFile){
            $oldPidText=(Get-Content -LiteralPath $pidFile -TotalCount 1).Trim()
            $oldPid=0
            $oldProcess=$null
            if([int]::TryParse($oldPidText,[ref]$oldPid)){
                $oldProcess=Get-Process -Id $oldPid -ErrorAction SilentlyContinue
            }
            $isDemoPostgres=$oldProcess -and $oldProcess.ProcessName -ieq 'postgres'
            if($isDemoPostgres){throw 'La PostgreSQL de demostración aún tiene un proceso activo; no se eliminará su archivo PID.'}
            Remove-Item -LiteralPath $pidFile -Force
            Write-Host 'Se limpió un archivo PID obsoleto de la base de demostración.'
        }
        & $pg -D $data -l (Join-Path $workspace '.tools/postgres.log') -o '-p 55432 -h 127.0.0.1' -w start
        if($LASTEXITCODE -ne 0){throw 'No se pudo iniciar PostgreSQL de demostración.'}
    }
    $env:DB_URL='jdbc:postgresql://127.0.0.1:55432/asistencia_migracion'
    $env:DB_USER='migracion_local'
    $env:DB_PASSWORD=''
    $psql='C:/Program Files/PostgreSQL/18/bin/psql.exe'
    & $psql -v ON_ERROR_STOP=1 -h 127.0.0.1 -p 55432 -U migracion_local -d asistencia_migracion -f (Join-Path $PSScriptRoot 'database/migrations/006_reprogramacion.sql')
    if($LASTEXITCODE -ne 0){throw 'No se pudo preparar el esquema de reprogramaciones.'}
}
$jar=Join-Path $PSScriptRoot 'target/asistencia-utp-0.1.0.jar'
if(!(Test-Path -LiteralPath $jar)){throw 'Primero ejecuta Build.ps1.'}
Write-Host ('Asistencia UTP: http://localhost:'+ $env:PORT)
& $java -jar $jar
exit $LASTEXITCODE
