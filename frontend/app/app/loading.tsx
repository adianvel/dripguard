import { SkeletonRows } from "@/components/ui";

export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="h-16 animate-pulse rounded-xl bg-line/70" />
      <SkeletonRows rows={5} />
    </div>
  );
}
