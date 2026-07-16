import { BrandMark, ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-bg px-4 text-fg">
      <BrandMark />
      <div className="space-y-3 text-center">
        <p className="mono-meta">404</p>
        <h1 className="text-2xl font-medium">Page not found</h1>
        <p className="max-w-sm text-sm text-muted">
          That route does not exist. Return to the app or home.
        </p>
      </div>
      <div className="flex gap-2">
        <ButtonLink href="/app">Open app</ButtonLink>
        <ButtonLink href="/" variant="outline">
          Home
        </ButtonLink>
      </div>
    </main>
  );
}
