import { BrandLogo } from "@/components/brand/logo";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-10 sm:py-14">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,var(--glacier-100),transparent_45%)]"
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandLogo href="/" height={44} priority />
          <p className="mt-3 text-sm text-muted-foreground">
            Votre espace de création d&apos;annonces eBay
          </p>
        </div>

        <div className="w-full rounded-2xl border border-border/80 bg-card p-6 shadow-lg sm:p-8">
          {children}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link
            href="/privacy"
            className="rounded-sm underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Politique de confidentialité
          </Link>
        </p>
      </div>
    </main>
  );
}
