<#
.SYNOPSIS
  Agent drawdown helper for DripGuard on Stellar testnet.

.EXAMPLE
  .\scripts\drawdown.ps1 -Agent G... -Payee G... -Amount 0.5 -Source agent-key
#>
param(
  [Parameter(Mandatory = $true)][string]$Agent,
  [Parameter(Mandatory = $true)][string]$Payee,
  [Parameter(Mandatory = $true)][string]$Amount,
  [string]$Source = "dripguard-deployer",
  [string]$Network = "testnet",
  [string]$ContractId = "CBUGXL76MTPFKXB5ONRLHB34QHL76J2CL6RBFBRS53HH3TZ5TX53Z3ML",
  [int]$Decimals = 7
)

$ErrorActionPreference = "Stop"

function ConvertTo-Stroops([string]$Human, [int]$Dec) {
  $raw = $Human.Trim()
  $neg = $raw.StartsWith("-")
  if ($neg) { $raw = $raw.Substring(1) }
  $parts = $raw.Split(".")
  $whole = if ($parts[0] -eq "") { "0" } else { $parts[0] }
  $frac = if ($parts.Length -gt 1) { $parts[1] } else { "" }
  $frac = ($frac + ("0" * $Dec)).Substring(0, $Dec)
  $stroops = [bigint]::Parse($whole) * [bigint]::Pow(10, $Dec) + [bigint]::Parse($(if ($frac -eq "") { "0" } else { $frac }))
  if ($neg) { $stroops = -$stroops }
  return $stroops.ToString()
}

$stroops = ConvertTo-Stroops -Human $Amount -Dec $Decimals

Write-Host "DripGuard drawdown"
Write-Host "  contract : $ContractId"
Write-Host "  network  : $Network"
Write-Host "  agent    : $Agent"
Write-Host "  payee    : $Payee"
Write-Host "  amount   : $Amount ($stroops stroops)"
Write-Host "  source   : $Source"
Write-Host ""

stellar contract invoke `
  --id $ContractId `
  --source-account $Source `
  --network $Network `
  -- `
  drawdown `
  --agent $Agent `
  --payee $Payee `
  --amount $stroops
