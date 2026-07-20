import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { PhotoUploadFlow } from "@/features/ads/components/photo-upload-flow";

export const metadata = {
  title: "Analyse par photo — Smart Seller",
};

export default function CreerPhotosPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard/creer">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Créer une annonce
        </Link>
      </Button>

      <PageHeader
        title="Ajouter des photos"
        description="Ajoutez les images de votre produit pour préparer son annonce."
      />

      <PhotoUploadFlow />
    </div>
  );
}
