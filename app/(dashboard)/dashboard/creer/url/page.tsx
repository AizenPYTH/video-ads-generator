import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UrlImportForm } from "@/features/url-import/components/url-import-form";

export const metadata = {
  title: "Import par URL — Smart Seller",
};

/** Import catalogue Utopya = N scrapes + créations d’annonces */
export const maxDuration = 300;

export default function CreerUrlPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard/creer">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Créer une annonce
        </Link>
      </Button>

      <PageHeader
        title="Importer depuis un lien"
        description="Collez l’URL d’une fiche produit ou d’une catégorie / boutique. Compatible avec la plupart des sites e-commerce (Amazon, fournisseurs, marketplaces…)."
      />

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-lg">Adresse web</CardTitle>
          <CardDescription>
            Produit unique : caractéristiques récupérées automatiquement.
            Boutique ou catégorie : jusqu’à 60 produits (pagination prise en
            charge quand disponible).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UrlImportForm />
        </CardContent>
      </Card>
    </div>
  );
}
