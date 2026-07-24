"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageDropzone } from "@/components/uploads/image-dropzone";
import { uploadImage } from "@/components/uploads/upload-image";
import { updateMarketingTemplate } from "@/features/settings/actions";
import type { MarketingTemplatesRow } from "@/types/database";

type MarketingSettingsProps = {
  template: MarketingTemplatesRow | null;
};

function asContentRecord(value: MarketingTemplatesRow["contenu"] | undefined) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...value }
    : {};
}

export function MarketingSettings({ template }: MarketingSettingsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(
    template?.nom ?? "Cadre de mon entreprise",
  );
  const [baseContent, setBaseContent] = useState<Record<string, unknown>>(() =>
    asContentRecord(template?.contenu),
  );
  const [frameUrl, setFrameUrl] = useState<string | null>(() => {
    const c = asContentRecord(template?.contenu);
    if (typeof c.frameUrl === "string") return c.frameUrl;
    if (typeof c.imageUrl === "string") return c.imageUrl;
    return null;
  });
  const [frameFiles, setFrameFiles] = useState<File[]>([]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    try {
      const nextFrameUrl = frameFiles[0]
        ? await uploadImage(frameFiles[0], "marketing-assets")
        : frameUrl;

      if (!nextFrameUrl) {
        toast.error("Ajoutez le cadre PNG de votre entreprise.");
        setIsLoading(false);
        return;
      }

      const contenu: Record<string, unknown> = {
        ...baseContent,
        frameUrl: nextFrameUrl,
        imageUrl: nextFrameUrl,
        useListingFrame: true,
      };

      const result = await updateMarketingTemplate({
        templateId: template?.id,
        nom: name.trim() || "Cadre de mon entreprise",
        type_template: "listing",
        contenu,
        est_par_defaut: true,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        setBaseContent(contenu);
        setFrameUrl(nextFrameUrl);
        setFrameFiles([]);
        toast.success("Cadre enregistré. Vous pouvez l’appliquer sur vos annonces.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible d'envoyer le cadre.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="nom">Nom</Label>
        <Input
          id="nom"
          value={name}
          disabled={isLoading}
          onChange={(event) => setName(event.target.value)}
          placeholder="ex. Cadre Boutique Dupont"
        />
      </div>

      <fieldset className="space-y-3" disabled={isLoading}>
        <legend className="text-sm font-medium">Cadre de mon entreprise</legend>
        <p className="text-sm text-muted-foreground">
          Uploadez votre propre cadre PNG (idéalement{" "}
          <strong className="font-medium text-foreground">1024×1024</strong>
          ) avec une zone blanche au centre pour la photo produit. Ce cadre
          remplace entièrement celui de Smart Seller. Ensuite, ouvrez une
          annonce et cliquez sur « Appliquer mon cadre ».
        </p>

        {frameUrl && frameFiles.length === 0 && (
          <div className="space-y-3 rounded-lg border p-3">
            <div className="mx-auto flex max-w-[240px] items-center justify-center rounded-md bg-muted p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={frameUrl}
                alt="Aperçu du cadre entreprise"
                className="max-h-56 w-auto max-w-full rounded object-contain"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">Cadre actuel</p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Retirer le cadre"
                onClick={() => setFrameUrl(null)}
              >
                <X aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}

        <ImageDropzone
          files={frameFiles}
          onFilesChange={setFrameFiles}
          maxFiles={1}
          disabled={isLoading}
          label={frameUrl ? "Remplacer mon cadre" : "Ajouter mon cadre PNG"}
        />
      </fieldset>

      <Button type="submit" disabled={isLoading}>
        {isLoading && <Loader2 className="animate-spin" aria-hidden="true" />}
        {isLoading ? "Enregistrement..." : "Enregistrer mon cadre"}
      </Button>
    </form>
  );
}
