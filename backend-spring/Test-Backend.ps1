param([Parameter(Mandatory=$true)][string]$DatabaseUrl,[string]$DatabaseUser='postgres')
$ErrorActionPreference='Stop'
if($DatabaseUrl -notmatch '/[^/?]+_test(?:\?|$)'){throw 'Las pruebas requieren una copia descartable cuyo nombre termine en _test.'}
$workspace=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$portable=Join-Path $workspace '.tools/java'
if(Test-Path -LiteralPath $portable){$env:JAVA_HOME=(Get-ChildItem -LiteralPath $portable -Directory | Select-Object -First 1).FullName}
$maven=Join-Path $workspace '.tools/maven/apache-maven-3.9.9/bin/mvn.cmd'
if(!(Test-Path -LiteralPath $maven)){$maven=(Get-Command mvn.cmd -ErrorAction Stop).Source}
$env:DB_URL=$DatabaseUrl
$env:DB_USER=$DatabaseUser
$env:RUN_POSTGRES_TESTS='true'
try{& $maven -B ('-Dmaven.repo.local='+$workspace+'/.tools/m2') -f (Join-Path $PSScriptRoot 'pom.xml') test;if($LASTEXITCODE -ne 0){throw 'Hay pruebas fallidas.'}}
finally{Remove-Item Env:RUN_POSTGRES_TESTS -ErrorAction SilentlyContinue}
