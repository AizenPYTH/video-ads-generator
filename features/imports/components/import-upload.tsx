"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileDropzone } from "@/components/uploads/file-dropzone";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  createImportBatch,
  processImportBatch,
} from "@/features/imports/actions";

type ImportUploadProps = {
  onBatchCreated?: (batchId: string) => void;
};

export function ImportUpload({ onBatchCreated }: ImportUploadProps) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [phase, setPhase] = useState<"idle" | "parsing" | "processing">("idle");
  const [rowCount, setRowCount] = useState<number | null>(null);

  async function handleImport() {
    const file = files[0];
    if (!file) {
      toast.error("Choisissez un fichier CSV ou XLSX.");
      return;
    }

    setPhase("parsing");
    setRowCount(null);

    try {
      const content = await file.arrayBuffer();
      const result = await createImportBatch(file.name, content);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.data) {
        setRowCount(result.data.acceptedRows + result.data.rowErrors.length);
      }

      if (result.data?.rowErrors?.length) {
        const preview = result.data.rowErrors
          .slice(0, 8)
          .map((error) => `Ligne ${error.row} : ${error.message}`)
          .join("\n");
        toast.warning(
          `${result.data.rowErrors.length} ligne${result.data.rowErrors.length > 1 ? "s" : ""} à corriger.\n${preview}`,
          { duration: 12_000 },
        );
      }

      if (result.data?.batchId) {
        toast.success("Analyse en cours");
        onBatchCreated?.(result.data.batchId);
        setPhase("processing");

        const processResult = await processImportBatch(result.data.batchId);
        if (processResult.error) {
          toast.error(processResult.error);
        } else if (processResult.data) {
          const failed = processResult.data.failed;
          toast.success(
            failed > 0
              ? `Import terminé · ${failed} ligne${failed > 1 ? "s" : ""} à corriger`
              : "Import terminé",
          );
        }

        router.push(`/dashboard/imports/${result.data.batchId}`);
        router.refresh();
      }
    } catch {
      toast.error("Impossible de lire ou d'importer ce fichier.");
    } finally {
      setPhase("idle");
    }
  }

  const isLoading = phase !== "idle";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importer des annonces</CardTitle>
        <CardDescription>
          CSV ou XLSX uniquement (pas de XLSM). Chaque ligne prépare une annonce
          brouillon. La catégorie eBay peut être détectée automatiquement.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FileDropzone
          files={files}
          onFilesChange={(nextFiles) => {
            setFiles(nextFiles);
            setRowCount(null);
          }}
          extensions={[".csv", ".xlsx"]}
          disabled={isLoading}
          label="Déposez votre fichier d'import ici"
          acceptedFormatsLabel="CSV ou XLSX uniquement"
          noClientSizeLimitLabel="Aucune limite de taille côté navigateur"
          validate={(file) =>
            file.name.toLowerCase().endsWith(".xlsm")
              ? "Les fichiers XLSM (macros) ne sont pas acceptés."
              : null
          }
        />

        {rowCount !== null && (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {rowCount} ligne(s) détectée(s) après analyse du fichier.
          </p>
        )}

        <Button
          type="button"
          disabled={isLoading || files.length === 0}
          onClick={handleImport}
          className="w-full"
          aria-busy={isLoading}
        >
          {isLoading && <Loader2 className="animate-spin" aria-hidden="true" />}
          {isLoading ? "Analyse en cours" : "Lancer l’import"}
        </Button>
      </CardContent>
    </Card>
  );
}
