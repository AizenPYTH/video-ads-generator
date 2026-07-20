import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhotoUploadFlow } from "@/features/ads/components/photo-upload-flow";

export const metadata = {
  title: "Analyse par photo — SNOWOLF",
};

export default function CreerPhotosPage() {
  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard/creer">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Link>
      </Button>
      <PhotoUploadFlow />
    </div>
  );
}
