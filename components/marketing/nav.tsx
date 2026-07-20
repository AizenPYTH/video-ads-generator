import Link from "next/link";
import { Snowflake } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-900 text-glacier-300">
            <Snowflake className="h-4 w-4" />
          </div>
          <span className="text-lg font-bold text-navy-900">SNOWOLF</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/#tarifs"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Tarifs
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Connexion
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild className="hidden sm:inline-flex">
            <Link href="/login">Se connecter</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Essai gratuit</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
