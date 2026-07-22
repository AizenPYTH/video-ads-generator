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
  const [name, setName] = useState(template?.nom ?? "Template Smart Seller");
  const [templateType, setTemplateType] = useState(
    template?.type_template ?? "listing",
  );
  const [baseContent, setBaseContent] = useState<Record<string, unknown>>(() =>
    asContentRecord(template?.contenu),
  );
  const [accentColor, setAccentColor] = useState(
    typeof baseContent.accentColor === "string"
      ? baseContent.accentColor
      : "#1e3a5f",
  );
  const [showPrice, setShowPrice] = useState(
    typeof baseContent.showPrice === "boolean" ? baseContent.showPrice : true,
  );
  const [logoUrl, setLogoUrl] = useState(
    typeof baseContent.logoUrl === "string" ? baseContent.logoUrl : null,
  );
  const [imageUrl, setImageUrl] = useState(
    typeof baseContent.imageUrl === "string" ? baseContent.imageUrl : null,
  );
  const [logoFiles, setLogoFiles] = useState<File[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    try {
      const nextLogoUrl = logoFiles[0]
        ? await uploadImage(logoFiles[0], "marketing-logo")
        : logoUrl;
      const nextImageUrl = imageFiles[0]
        ? await uploadImage(imageFiles[0], "marketing-assets")
        : imageUrl;
      const contenu: Record<string, unknown> = {
        ...baseContent,
        accentColor,
        showPrice,
      };

      if (nextLogoUrl) contenu.logoUrl = nextLogoUrl;
      else delete contenu.logoUrl;
      if (nextImageUrl) contenu.imageUrl = nextImageUrl;
      else delete contenu.imageUrl;

      const result = await updateMarketingTemplate({
        templateId: template?.id,
        nom: name,
        type_template: templateType,
        contenu,
        est_par_defaut: true,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        setBaseContent(contenu);
        setLogoUrl(nextLogoUrl);
        setImageUrl(nextImageUrl);
        setLogoFiles([]);
        setImageFiles([]);
        toast.success("Template marketing sauvegardé.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible d'envoyer les images marketing.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="nom">Nom du template</Label>
        <Input
          id="nom"
          value={name}
          disabled={isLoading}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="type_template">Type</Label>
        <Input
          id="type_template"
          value={templateType}
          disabled={isLoading}
          onChange={(event) => setTemplateType(event.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="accentColor">Couleur d’accent</Label>
          <div className="flex gap-2">
            <Input
              id="accentColor"
              type="color"
              value={accentColor}
              disabled={isLoading}
              onChange={(event) => setAccentColor(event.target.value)}
              className="w-16 p-1"
            />
            <Input
              value={accentColor}
              disabled={isLoading}
              aria-label="Code de la couleur d’accent"
              onChange={(event) => setAccentColor(event.target.value)}
            />
          </div>
        </div>
        <label className="flex items-center gap-3 self-end rounded-lg border p-3 text-sm font-medium">
          <input
            type="checkbox"
            checked={showPrice}
            disabled={isLoading}
            onChange={(event) => setShowPrice(event.target.checked)}
            className="h-4 w-4"
          />
          Afficher le prix
        </label>
      </div>

      <fieldset className="space-y-3" disabled={isLoading}>
        <legend className="text-sm font-medium">
          Logo site (optionnel)
        </legend>
        <p className="text-sm text-muted-foreground">
          Ce n’est <strong className="font-medium text-foreground">pas</strong>{" "}
          le cadre d’annonce. Le cadre Smart Seller (badges, zone blanche) sert
          uniquement à « Générer image Smart Seller » : votre photo produit va au
          centre. Ici, un logo site éventuel pour l’identité du compte — PNG{" "}
          <strong className="font-medium text-foreground">512×512</strong>.
        </p>
        {logoUrl && logoFiles.length === 0 && (
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <div
              role="img"
              aria-label="Aperçu du logo actuel"
              className="h-20 w-28 shrink-0 rounded-md bg-contain bg-center bg-no-repeat"
              style={{ backgroundImage: `url("${logoUrl}")` }}
            />
            <p className="flex-1 text-sm text-muted-foreground">Logo actuel</p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Retirer le logo"
              onClick={() => setLogoUrl(null)}
            >
              <X aria-hidden="true" />
            </Button>
          </div>
        )}
        <ImageDropzone
          files={logoFiles}
          onFilesChange={setLogoFiles}
          maxFiles={1}
          disabled={isLoading}
          label={logoUrl ? "Remplacer le logo" : "Ajouter un logo"}
        />
      </fieldset>

      <fieldset className="space-y-3" disabled={isLoading}>
        <legend className="text-sm font-medium">Image marketing</legend>
        <p className="text-sm text-muted-foreground">
          Visuel optionnel pour votre compte (aperçu limité ci-dessous). Ce
          n’est pas le cadre d’annonce Snowwolf : pour encadrer un produit,
          utilisez « Générer image » depuis une annonce.
        </p>
        {imageUrl && imageFiles.length === 0 && (
          <div className="space-y-3 rounded-lg border border-[var(--ss-border)] p-3">
            <div className="mx-auto flex max-w-[220px] items-center justify-center rounded-md bg-[var(--ss-surface-muted)] p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Aperçu de l’image marketing actuelle"
                className="max-h-48 w-auto max-w-full rounded object-contain"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">Image actuelle</p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Retirer l’image marketing"
                onClick={() => setImageUrl(null)}
              >
                <X aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}
        <ImageDropzone
          files={imageFiles}
          onFilesChange={setImageFiles}
          maxFiles={1}
          disabled={isLoading}
          label={imageUrl ? "Remplacer l’image marketing" : "Ajouter une image marketing"}
        />
      </fieldset>

      <Button type="submit" disabled={isLoading}>
        {isLoading && <Loader2 className="animate-spin" aria-hidden="true" />}
        {isLoading ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </form>
  );
}
