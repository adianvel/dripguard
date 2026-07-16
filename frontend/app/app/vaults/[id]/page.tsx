import { VaultDetail } from "@/components/vault-detail";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agentId = decodeURIComponent(id);

  return <VaultDetail agentId={agentId} />;
}
