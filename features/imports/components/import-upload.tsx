"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createImportBatch, processImportBatch } from "@/features/imports/actions";

type ImportUploadProps = {
  onBatchCreated?: (batchId: string) => void;
};

export function ImportUpload({ onBatchCreated }: ImportUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleFile(file: File) {
    setIsLoading(true);

    const isXlsx = file.name.toLowerCase().endsWith(".xlsx");
    const content = isXlsx
      ? await file.arrayBuffer()
      : await file.text();

    const result = await createImportBatch(file.name, content);

    if (result.error) {
      toast.error(result.error);
      setIsLoading(false);
      return;
    }

    if (result.data?.batchId) {
      toast.success("Fichier importé. Traitement en cours...");
      onBatchCreated?.(result.data.batchId);

      const processResult = await processImportBatch(result.data.batchId);
      if (processResult.error) {
        toast.error(processResult.error);
      } else if (processResult.data) {
        toast.success(
          `${processResult.data.succeeded} annonce(s) créée(s), ${processResult.data.failed} erreur(s).`,
        );
      }
    }

    setIsLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importer des annonces</CardTitle>
        <CardDescription>
          Importez un fichier CSV ou XLSX (sans macros). Colonnes requises : titre, prix_vente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <Button
          variant="outline"
          disabled={isLoading}
          onClick={() => inputRef.current?.click()}
          className="w-full"
        >
          <Upload className="mr-2 h-4 w-4" />
          {isLoading ? "Import en cours..." : "Choisir un fichier"}
        </Button>
      </CardContent>
    </Card>
  );
}
