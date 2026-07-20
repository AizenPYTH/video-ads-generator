import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { ImportUpload } from "@/features/imports/components/import-upload";
import { ImportTemplateDownloads } from "@/features/imports/components/import-template-downloads";

export const metadata = {
  title: "Import fichier — Smart Seller",
};

export default function CreerImportPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard/creer">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Créer une annonce
        </Link>
      </Button>

      <PageHeader
        title="Importer un fichier"
        description="Ajoutez un fichier CSV ou Excel pour préparer plusieurs annonces."
      />

      <ImportTemplateDownloads />
      <ImportUpload />
    </div>
  );
}
