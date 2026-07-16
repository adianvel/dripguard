<#
.SYNOPSIS
  Read vault state from DripGuard on testnet.
#>
param(
  [Parameter(Mandatory = $true)][string]$Agent,
  [string]$Network = "testnet",
  [string]$ContractId = "CBUGXL76MTPFKXB5ONRLHB34QHL76J2CL6RBFBRS53HH3TZ5TX53Z3ML",
  [string]$Source = "dripguard-deployer"
)

$ErrorActionPreference = "Stop"

Write-Host "== get_vault =="
stellar contract invoke --id $ContractId --source-account $Source --network $Network -- get_vault --agent $Agent

Write-Host "`n== vested_amount =="
stellar contract invoke --id $ContractId --source-account $Source --network $Network -- vested_amount --agent $Agent

Write-Host "`n== claimable_amount =="
stellar contract invoke --id $ContractId --source-account $Source --network $Network -- claimable_amount --agent $Agent
