import { getNetwork, getNetworkDetails } from "@stellar/freighter-api";
import { NETWORK } from "@/lib/config";

export type NetworkStatus = {
  ok: boolean;
  network: string | null;
  networkPassphrase: string | null;
  message: string | null;
};

/**
 * Ensure Freighter is on the same network as the app (testnet by default).
 */
export async function checkFreighterNetwork(): Promise<NetworkStatus> {
  try {
    const details = await getNetworkDetails();
    if (details.error) {
      // Fallback to lighter getNetwork
      const net = await getNetwork();
      if (net.error || !net.networkPassphrase) {
        return {
          ok: false,
          network: null,
          networkPassphrase: null,
          message: "Could not read Freighter network. Unlock Freighter and try again.",
        };
      }
      const ok = net.networkPassphrase === NETWORK.networkPassphrase;
      return {
        ok,
        network: net.network ?? null,
        networkPassphrase: net.networkPassphrase,
        message: ok
          ? null
          : `Freighter is on "${net.network}". Switch to Testnet to use DripGuard.`,
      };
    }

    const passphrase = details.networkPassphrase ?? null;
    const ok = passphrase === NETWORK.networkPassphrase;
    return {
      ok,
      network: details.network ?? null,
      networkPassphrase: passphrase,
      message: ok
        ? null
        : `Freighter is on "${details.network ?? "unknown"}". Switch to Testnet to use DripGuard.`,
    };
  } catch {
    return {
      ok: false,
      network: null,
      networkPassphrase: null,
      message: "Could not verify Freighter network.",
    };
  }
}

export async function assertFreighterNetwork() {
  const status = await checkFreighterNetwork();
  if (!status.ok) {
    throw new Error(status.message || "Wrong network in Freighter.");
  }
  return status;
}
