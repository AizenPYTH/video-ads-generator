import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { CleanupPanel } from "@/features/settings/components/cleanup-panel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Nettoyage données de test — Smart Seller",
};

export default function NettoyagePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Nettoyage des données de test"
        description="Aperçu dry-run puis suppression manuelle confirmée. Les annonces publiées ne sont jamais effacées ici."
      />
      <p className="text-sm text-muted-foreground">
        <Link
          href="/dashboard/parametres"
          className="underline underline-offset-2 hover:text-foreground"
        >
          ← Retour aux paramètres
        </Link>
      </p>
      <Card>
        <CardHeader>
          <CardTitle>Données de test</CardTitle>
          <CardDescription>
            Compteurs pour votre compte uniquement. Confirmation obligatoire :{" "}
            <code className="text-xs">SUPPRIMER LES DONNÉES DE TEST</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CleanupPanel />
        </CardContent>
      </Card>
    </div>
  );
}
