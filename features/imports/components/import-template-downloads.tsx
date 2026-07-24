"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ImportTemplateDownloads() {
  return (
    <Button variant="outline" asChild>
      <a href="/templates/modele-import-ebay.xlsx" download>
        <Download className="mr-2 h-4 w-4" />
        Télécharger un modèle
      </a>
    </Button>
  );
}
