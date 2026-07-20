"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ImageDropzone } from "@/components/uploads/image-dropzone";

export function PhotoUploadFlow() {
  const router = useRouter();
  const [photos, setPhotos] = useState<File[]>([]);
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState<"upload" | "analyzing" | "done">("upload");
  const [progress, setProgress] = useState(0);

  async function handleAnalyze() {
    if (photos.length === 0) {
      toast.error("Ajoutez au moins une photo.");
      return;
    }

    setStep("analyzing");
    setProgress(10);

    try {
      const uploadedUrls: string[] = [];

      for (let i = 0; i < photos.length; i++) {
        const formData = new FormData();
        formData.append("file", photos[i]);
        formData.append("folder", "analysis");

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.error?.message ?? "Échec du téléversement.");
        }

        const { url } = await uploadRes.json();
        uploadedUrls.push(url);
        setProgress(10 + Math.round(((i + 1) / photos.length) * 40));
      }

      setProgress(55);

      const analysisRes = await fetch("/api/analysis/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoUrls: uploadedUrls,
          notes: notes || undefined,
        }),
      });

      if (!analysisRes.ok) {
        const err = await analysisRes.json();
        throw new Error(err.error?.message ?? "Échec de l'analyse.");
      }

      setProgress(100);
      const result = await analysisRes.json();
      setStep("done");
      toast.success("Analyse terminée !");

      if (result.adId) {
        router.push(`/dashboard/annonces/${result.adId}`);
      } else if (result.analyzedProductId) {
        router.push(`/dashboard/produits/${result.analyzedProductId}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue.");
      setStep("upload");
      setProgress(0);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Analyser des photos</CardTitle>
          <CardDescription>
            Ajoutez des photos de votre produit. Smart Seller identifiera
            automatiquement marque, modèle et caractéristiques.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ImageDropzone
            files={photos}
            onFilesChange={setPhotos}
            maxFiles={12}
            disabled={step === "analyzing"}
            label="Glissez vos photos ici"
          />

          <div className="space-y-2">
            <Label htmlFor="notes">Notes complémentaires (facultatif)</Label>
            <Textarea
              id="notes"
              placeholder="Ex. : boîte d'origine, petit choc sur le côté..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {step === "analyzing" && (
            <div
              className="space-y-2"
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Analyse en cours
              </div>
              <Progress value={progress} />
            </div>
          )}

          <Button
            onClick={handleAnalyze}
            disabled={photos.length === 0 || step === "analyzing"}
            className="w-full"
          >
            {step === "analyzing" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Analyse en cours
              </>
            ) : (
              "Lancer l'analyse"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
