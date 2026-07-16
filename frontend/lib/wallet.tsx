"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { connectFreighter, freighterAvailable } from "@/lib/stellar";
import { checkFreighterNetwork, type NetworkStatus } from "@/lib/network";
import { formatUserError } from "@/lib/errors";
import { shortAddress, NETWORK } from "@/lib/config";

type WalletContextValue = {
  address: string | null;
  connecting: boolean;
  available: boolean | null;
  error: string | null;
  short: string | null;
  network: NetworkStatus | null;
  networkOk: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshNetwork: () => Promise<void>;
};

const WalletContext = createContext<WalletContextValue | null>(null);

const STORAGE_KEY = "dripguard.wallet";

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [network, setNetwork] = useState<NetworkStatus | null>(null);

  const refreshNetwork = useCallback(async () => {
    const status = await checkFreighterNetwork();
    setNetwork(status);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await freighterAvailable();
      if (cancelled) return;
      setAvailable(ok);
      if (ok) {
        const status = await checkFreighterNetwork();
        if (!cancelled) setNetwork(status);
      }
      const cached = window.localStorage.getItem(STORAGE_KEY);
      if (cached && ok) {
        setAddress(cached);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const status = await checkFreighterNetwork();
      setNetwork(status);
      if (!status.ok) {
        throw new Error(status.message || "Switch Freighter to Testnet.");
      }
      const addr = await connectFreighter();
      setAddress(addr);
      window.localStorage.setItem(STORAGE_KEY, addr);
    } catch (err) {
      setError(formatUserError(err, "Failed to connect wallet"));
      throw err;
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo<WalletContextValue>(
    () => ({
      address,
      connecting,
      available,
      error,
      short: address ? shortAddress(address) : null,
      network,
      networkOk: network?.ok ?? false,
      connect,
      disconnect,
      refreshNetwork,
    }),
    [address, connecting, available, error, network, connect, disconnect, refreshNetwork],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used within WalletProvider");
  }
  return ctx;
}

export function networkLabel() {
  return NETWORK.name;
}
