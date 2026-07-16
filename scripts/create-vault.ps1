<#
.SYNOPSIS
  Create a DripGuard vault on testnet (admin deposits token into contract).

.EXAMPLE
  .\scripts\create-vault.ps1 -Admin G... -Agent G... -Payee G... -Amount 10 -Source admin-key
#>
param(
  [Parameter(Mandatory = $true)][string]$Admin,
  [Parameter(Mandatory = $true)][string]$Agent,
  [Parameter(Mandatory = $true)][string]$Payee,
  [string]$Amount = "10",
  [string]$CliffSeconds = "0",
  [string]$ReleaseRate = "0.0001",
  [string]$MaxPerCall = "1",
  [string]$VelocityMax = "5",
  [string]$VelocityWindowSeconds = "3600",
  [string]$Token = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
  [string]$Source = "dripguard-deployer",
  [string]$Network = "testnet",
  [string]$ContractId = "CBUGXL76MTPFKXB5ONRLHB34QHL76J2CL6RBFBRS53HH3TZ5TX53Z3ML",
  [int]$Decimals = 7
)

$ErrorActionPreference = "Stop"

function ConvertTo-Stroops([string]$Human, [int]$Dec) {
  $raw = $Human.Trim()
  $parts = $raw.Split(".")
  $whole = if ($parts[0] -eq "") { "0" } else { $parts[0] }
  $frac = if ($parts.Length -gt 1) { $parts[1] } else { "" }
  $frac = ($frac + ("0" * $Dec)).Substring(0, $Dec)
  return ([bigint]::Parse($whole) * [bigint]::Pow(10, $Dec) + [bigint]::Parse($(if ($frac -eq "") { "0" } else { $frac }))).ToString()
}

$amountS = ConvertTo-Stroops $Amount $Decimals
$rateS = ConvertTo-Stroops $ReleaseRate $Decimals
$maxS = ConvertTo-Stroops $MaxPerCall $Decimals
$velMaxS = ConvertTo-Stroops $VelocityMax $Decimals

Write-Host "Creating vault: admin=$Admin agent=$Agent amount=$Amount velocity=$VelocityMax/$VelocityWindowSeconds`s"

$allowlistPath = Join-Path $PSScriptRoot "_allowlist.generated.json"
('["{0}"]' -f $Payee) | Out-File -Encoding ascii -FilePath $allowlistPath -NoNewline

stellar contract invoke `
  --id $ContractId `
  --source-account $Source `
  --network $Network `
  --send=yes `
  -- `
  create_vault `
  --admin $Admin `
  --agent $Agent `
  --token $Token `
  --amount $amountS `
  --cliff-seconds $CliffSeconds `
  --release-rate-per-sec $rateS `
  --max-per-call $maxS `
  --allowlist-file-path $allowlistPath `
  --velocity-window-seconds $VelocityWindowSeconds `
  --velocity-max $velMaxS
