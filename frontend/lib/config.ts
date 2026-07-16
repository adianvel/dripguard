export const NETWORK = {
  name: "testnet",
  networkPassphrase: "Test SDF Network ; September 2015",
  rpcUrl: process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org",
  horizonUrl:
    process.env.NEXT_PUBLIC_HORIZON_URL ?? "https://horizon-testnet.stellar.org",
  explorerBase: "https://stellar.expert/explorer/testnet",
  contractId:
    process.env.NEXT_PUBLIC_DRIPGUARD_CONTRACT_ID ??
    "CBUGXL76MTPFKXB5ONRLHB34QHL76J2CL6RBFBRS53HH3TZ5TX53Z3ML",
  nativeTokenContractId:
    process.env.NEXT_PUBLIC_NATIVE_TOKEN_CONTRACT_ID ??
    "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
  tokenDecimals: 7,
} as const;

export function explorerTxUrl(hash: string) {
  return `${NETWORK.explorerBase}/tx/${hash}`;
}

export function explorerContractUrl(id = NETWORK.contractId) {
  return `${NETWORK.explorerBase}/contract/${id}`;
}

export function shortAddress(address: string, size = 4) {
  if (address.length <= size * 2 + 3) return address;
  return `${address.slice(0, size + 1)}…${address.slice(-size)}`;
}
