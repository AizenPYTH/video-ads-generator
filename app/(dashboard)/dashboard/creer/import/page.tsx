import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImportUpload } from "@/features/imports/components/import-upload";

export const metadata = {
  title: "Import fichier — SNOWOLF",
};

export default function CreerImportPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard/creer">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold text-navy-900">Import CSV ou Excel</h1>
        <p className="text-muted-foreground">
          Importez plusieurs annonces depuis un fichier tableur
        </p>
      </div>

      <ImportUpload />
    </div>
  );
}
