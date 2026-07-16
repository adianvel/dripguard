import { AppShell } from "@/components/app-shell";
import { WalletProvider } from "@/lib/wallet";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <AppShell>{children}</AppShell>
    </WalletProvider>
  );
}
