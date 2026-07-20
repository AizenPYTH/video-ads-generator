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

export const metadata = {
  title: "Connexion eBay — Smart Seller",
  description: "Résultat de l'autorisation OAuth eBay pour Smart Seller.",
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

export default async function EbayOAuthResultPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const error = firstParam(params.error);
  const connected = firstParam(params.connected) === "true";
  const denied = error === "access_denied";

  let title = "Connexion eBay";
  let description = "En attente du résultat de l'autorisation eBay.";
  let Icon = AlertTriangle;
  let iconClass = "text-amber-600";

  if (connected && !error) {
    title = "Compte eBay connecté";
    description =
      "L'autorisation a réussi. Vous pouvez maintenant publier vos annonces depuis Smart Seller.";
    Icon = CheckCircle2;
    iconClass = "text-green-600";
  } else if (denied) {
    title = "Autorisation refusée";
    description =
      "Vous avez refusé l'accès à votre compte eBay. Aucune donnée n'a été enregistrée.";
    Icon = XCircle;
    iconClass = "text-destructive";
  } else if (error) {
    title = "Échec de la connexion eBay";
    description =
      "La connexion n'a pas pu être finalisée. Vous pouvez réessayer depuis votre espace.";
    Icon = XCircle;
    iconClass = "text-destructive";
  }

  return (
    <div className="flex min-h-screen flex-col">
      <MarketingNav />
      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-16 sm:px-6">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,var(--glacier-100),transparent_45%)]"
          aria-hidden="true"
        />
        <Card className="relative w-full max-w-lg rounded-2xl border-border/80 shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Icon className={`h-7 w-7 ${iconClass}`} aria-hidden="true" />
            </div>
            <CardTitle className="text-2xl tracking-tight">{title}</CardTitle>
            <CardDescription className="leading-6">{description}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            {connected && !error ? (
              <>
                <Button asChild>
                  <Link href="/dashboard/ebay">Gérer mon compte eBay</Link>
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
