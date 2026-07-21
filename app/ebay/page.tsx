import Link from "next/link";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { showDeveloperTools } from "@/lib/ui/dev-tools";

export const metadata = {
  title: "Connexion eBay — Smart Seller",
  description: "Résultat de la connexion de votre compte vendeur eBay.",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function humanizeEbayError(error: string, showDev: boolean): string {
  const lower = error.toLowerCase();
  if (lower.includes("état oauth") || lower.includes("oauth state")) {
    return "La session de connexion a expiré. Revenez sur Compte eBay et réessayez.";
  }
  if (lower.includes("encryption_key") || lower.includes("token exchange") || lower.includes("credentials")) {
    return "Nous n’avons pas pu connecter votre compte eBay. Vérifiez vos identifiants puis réessayez.";
  }
  if (showDev && error.length > 8 && error.length < 280) {
    return error;
  }
  return "Nous n’avons pas pu connecter votre compte eBay. Vérifiez vos identifiants puis réessayez.";
}

export default async function EbayOAuthResultPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const error = firstParam(params.error);
  const connected = firstParam(params.connected) === "true";
  const denied = error === "access_denied";
  const showDev = showDeveloperTools();

  let title = "Connexion eBay";
  let description = "Finalisation de la connexion à votre compte vendeur.";
  let Icon = AlertTriangle;
  let iconClass = "text-[var(--ss-warning)]";

  if (connected && !error) {
    title = "Compte eBay connecté";
    description =
      "Votre compte vendeur est prêt. Vous pouvez publier et gérer vos annonces depuis Smart Seller.";
    Icon = CheckCircle2;
    iconClass = "text-[var(--ss-success)]";
  } else if (denied) {
    title = "Connexion annulée";
    description =
      "Vous avez refusé l’accès à votre compte eBay. Aucune donnée n’a été enregistrée.";
    Icon = XCircle;
    iconClass = "text-[var(--ss-danger)]";
  } else if (error) {
    title = "Connexion impossible";
    description = humanizeEbayError(error, showDev);
    Icon = XCircle;
    iconClass = "text-[var(--ss-danger)]";
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--ss-surface-muted)]">
      <MarketingNav />
      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-16 sm:px-6">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,var(--ss-glacier-100),transparent_50%)]"
          aria-hidden="true"
        />
        <Card className="relative w-full max-w-lg shadow-[var(--ss-shadow-md)]">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-[var(--ss-glacier-50)]">
              <Icon className={`size-7 ${iconClass}`} aria-hidden="true" />
            </div>
            <CardTitle className="text-2xl tracking-tight">{title}</CardTitle>
            <CardDescription className="leading-6">{description}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            {connected && !error ? (
              <>
                <Button asChild>
                  <Link href="/dashboard/ebay">Gérer la connexion</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/dashboard">Tableau de bord</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild>
                  <Link href="/dashboard/ebay">Réessayer</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/login">Se connecter</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </main>
      <MarketingFooter />
    </div>
  );
}
