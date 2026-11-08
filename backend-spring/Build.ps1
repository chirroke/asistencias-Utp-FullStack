$ErrorActionPreference='Stop'
$workspace=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$portable=Join-Path $workspace '.tools/java'
if(Test-Path -LiteralPath $portable){$env:JAVA_HOME=(Get-ChildItem -LiteralPath $portable -Directory | Select-Object -First 1).FullName}
$maven=Join-Path $workspace '.tools/maven/apache-maven-3.9.9/bin/mvn.cmd'
if(!(Test-Path -LiteralPath $maven)){$maven=(Get-Command mvn.cmd -ErrorAction Stop).Source}
Push-Location (Join-Path $PSScriptRoot '../frontend')
try{& npm.cmd run build;if($LASTEXITCODE -ne 0){throw 'Falló la compilación de React.'}}finally{Pop-Location}
& $maven -B ('-Dmaven.repo.local='+$workspace+'/.tools/m2') -f (Join-Path $PSScriptRoot 'pom.xml') package
if($LASTEXITCODE -ne 0){throw 'Falló la compilación de Spring.'}
Write-Host 'Aplicación compilada. Ejecuta Start-Backend.ps1 -Demo.'
