"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Camera, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";

type UploadedPhoto = {
  file: File;
  preview: string;
  url?: string;
};

export function PhotoUploadFlow() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState<"upload" | "analyzing" | "done">("upload");
  const [progress, setProgress] = useState(0);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const newPhotos = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPhotos((prev) => [...prev, ...newPhotos].slice(0, 12));
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].preview);
      next.splice(index, 1);
      return next;
    });
  }

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
        formData.append("file", photos[i].file);
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
            Ajoutez des photos de votre produit. SNOWOLF identifiera
            automatiquement marque, modèle et caractéristiques.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          {photos.length === 0 ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-16 transition-colors hover:border-glacier-300 hover:bg-muted/50"
            >
              <Camera className="mb-4 h-10 w-10 text-muted-foreground" />
              <p className="font-medium">Glissez vos photos ici</p>
              <p className="mt-1 text-sm text-muted-foreground">
                ou cliquez pour parcourir (max. 12 photos)
              </p>
            </button>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {photos.map((photo, index) => (
                <div
                  key={photo.preview}
                  className="relative aspect-square overflow-hidden rounded-lg border bg-muted"
                >
                  <Image
                    src={photo.preview}
                    alt={`Photo ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {photos.length < 12 && (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-glacier-300"
                >
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </button>
              )}
            </div>
          )}

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
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyse en cours...
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyse en cours...
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
