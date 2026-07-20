import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UrlImportForm } from "@/features/url-import/components/url-import-form";

export const metadata = {
  title: "Import par URL — SNOWOLF",
};

export default function CreerUrlPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard/creer">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold text-navy-900">Import depuis une URL</h1>
        <p className="text-muted-foreground">
          Collez le lien d&apos;un produit pour créer une annonce
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lien du produit</CardTitle>
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
