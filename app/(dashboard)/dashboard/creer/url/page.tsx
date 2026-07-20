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
        description="Collez l'adresse d'un produit pour préparer son annonce."
      />

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-lg">Adresse du produit</CardTitle>
          <CardDescription>
            eBay, site marchand ou autre page produit compatible
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UrlImportForm />
        </CardContent>
      </Card>
    </div>
  );
}
