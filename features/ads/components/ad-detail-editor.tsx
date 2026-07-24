"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  ImageIcon,
  Loader2,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PublishDialog } from "@/features/ads/components/publish-dialog";
import {
  AdImagesPanel,
  type EditorAdImage,
} from "@/features/ads/components/ad-images-panel";
import { updateAd } from "@/features/ads/actions";
import { statusLabelFr } from "@/features/ads/recalculate-status";
import {
  previewMarketingImage,
  commitMarketingImage,
} from "@/features/marketing-images/actions";
import type { AdValidationResult } from "@/features/ads/validation";
import {
  formatPriceForStorage,
  parseFrenchPrice,
  PRICE_NOT_DETECTED_MESSAGE,
} from "@/lib/scraping/parse-price";

type CategoryResolution = {
  status?: string;
  categoryId?: string | null;
  categoryName?: string | null;
  rootCategoryName?: string | null;
  subcategoryName?: string | null;
  categoryPath?: string[];
  confidence?: number;
  message?: string;
  alternatives?: Array<{
    categoryId: string;
    categoryName: string;
    confidence: number;
  }>;
};

function asText(value: unknown): string {
  if (value == null) return "";
  return String(value);
}

type Props = {
  adId: string;
  initial: {
    titre: string;
    description: string;
    prix_vente: string;
    quantite: number;
    ebay_condition_id: string;
    ebay_category_id: string;
    sku: string;
    statut: string;
  };
  images: EditorAdImage[];
  resolution: CategoryResolution | null;
  validation: AdValidationResult;
  currency?: string | null;
  ebayListingId?: string | null;
  ebayListingUrl?: string | null;
  ebaySellerListingsUrl?: string | null;
  priceWarning?: string | null;
  identification?: {
    soldItem?: { type?: string | null; name?: string | null } | null;
    brand?: string | null;
    model?: string | null;
    partNumber?: string | null;
    compatibility?: {
      brand?: string | null;
      device?: string | null;
      modelNumber?: string | null;
    } | null;
    confidence?: { global?: number } | null;
    warnings?: string[] | null;
    needsReview?: boolean;
  } | null;
  /** Caractéristiques eBay éditables (Couleur, Marque…) */
  aspectFields?: Array<{
    name: string;
    required: boolean;
    values: string[];
    value: string;
  }>;
  /** @deprecated non affiché aux utilisateurs */
  isSandbox?: boolean;
};

export function AdDetailEditor({
  adId,
  initial,
  images: initialImages,
  resolution,
  validation,
  currency,
  ebayListingId: _ebayListingId,
  ebayListingUrl,
  ebaySellerListingsUrl,
  priceWarning,
  identification,
  aspectFields: initialAspectFields = [],
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const priceRef = useRef<HTMLInputElement>(null);

  const [titre, setTitre] = useState(() => asText(initial.titre));
  const [prix, setPrix] = useState(() => asText(initial.prix_vente));
  const [aspectValues, setAspectValues] = useState<Record<string, string>>(
    () =>
      Object.fromEntries(
        initialAspectFields.map((f) => [f.name, asText(f.value)]),
      ),
  );
  const [images, setImages] = useState<EditorAdImage[]>(() =>
    [...initialImages].sort((a, b) => a.ordre - b.ordre),
  );
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [marketingPreview, setMarketingPreview] = useState<string | null>(null);

  useEffect(() => {
    setTitre(asText(initial.titre));
    setPrix(asText(initial.prix_vente));
  }, [initial.titre, initial.prix_vente]);

  useEffect(() => {
    setAspectValues(
      Object.fromEntries(
        initialAspectFields.map((f) => [f.name, asText(f.value)]),
      ),
    );
  }, [initialAspectFields]);

  useEffect(() => {
    setImages([...initialImages].sort((a, b) => a.ordre - b.ordre));
  }, [initialImages]);

  const parsedPrice = parseFrenchPrice(prix);
  const priceMissing = parsedPrice == null;
  const primary =
    images.find((i) => i.est_principale) ?? images[0] ?? null;
  const missingAspectNames = initialAspectFields
    .filter((f) => f.required && !asText(aspectValues[f.name]).trim())
    .map((f) => f.name);

  useEffect(() => {
    if (priceMissing) priceRef.current?.focus();
  }, [priceMissing]);

  const publishValidation = useMemo((): AdValidationResult => {
    const errors = [...(validation.errors ?? [])].filter(
      (err) => err.field !== "titre" && err.field !== "prix_vente",
    );
    const titleText = asText(titre).trim();
    const priceText = asText(prix).trim();

    if (!titleText) {
      errors.push({ field: "titre", message: "Le titre est obligatoire." });
    } else if (titleText.length > 80) {
      errors.push({
        field: "titre",
        message: "Le titre ne doit pas dépasser 80 caractères.",
      });
    }

    if (!priceText || parseFrenchPrice(priceText) == null) {
      errors.push({
        field: "prix_vente",
        message: "Le prix de vente doit être supérieur à 0.",
      });
    }

    // Les images sont déjà persistées à l’ajout — pas besoin d’« Enregistrer »
    // pour publier. On exige au moins une image HTTPS pour eBay.
    if (!images.some((img) => /^https:\/\//i.test(img.url))) {
      errors.push({
        field: "images",
        message: "Ajoutez au moins une image avant de publier.",
      });
    }

    for (const name of missingAspectNames) {
      errors.push({
        field: `aspect:${name}`,
        message: `Le champ « ${name} » est obligatoire.`,
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: validation.warnings ?? [],
    };
  }, [validation, titre, prix, images, missingAspectNames]);

  function setAspectValue(name: string, value: string) {
    setAspectValues((prev) => ({ ...prev, [name]: value }));
  }

  function runAction(action: string, task: () => Promise<void>) {
    setPendingAction(action);
    startTransition(() => {
      void (async () => {
        try {
          await task();
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : "Une erreur est survenue.",
          );
        } finally {
          setPendingAction(null);
        }
      })();
    });
  }

  async function persistCurrentFields(): Promise<{ error?: string } | void> {
    const normalizedPrice = formatPriceForStorage(prix);
    if (asText(prix).trim() && normalizedPrice == null) {
      return { error: "Prix invalide. Exemple : 12 ou 12,50" };
    }

    const result = await updateAd(adId, {
      titre: asText(titre).trim() || null,
      prix_vente: normalizedPrice,
      description: asText(initial.description).trim() || null,
      quantite: Math.max(1, Number(initial.quantite) || 1),
      ebay_condition_id: asText(initial.ebay_condition_id).trim() || null,
      sku: asText(initial.sku).trim() || null,
      ebay_category_id: asText(initial.ebay_category_id).trim() || null,
      item_specifics: aspectValues,
    });
    if (result?.error) return { error: result.error };
    if (normalizedPrice) setPrix(normalizedPrice);
  }

  function save() {
    runAction("save", async () => {
      const result = await persistCurrentFields();
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Annonce enregistrée");
      router.refresh();
    });
  }

  function generateMarketing() {
    if (!primary) {
      toast.error("Ajoutez une image principale d’abord.");
      return;
    }
    if (!asText(titre).trim()) {
      toast.error("Indiquez un titre avant de générer l’image.");
      return;
    }
    runAction("marketing-image", async () => {
      const result = await previewMarketingImage({
        adId,
        productImageUrl: primary.url,
        storagePath: primary.storage_path,
        title: asText(titre).trim(),
        price: asText(prix).trim() || undefined,
      });
      if (result.error || !result.data) {
        toast.error(result.error ?? "Échec de la génération du cadre.");
        return;
      }
      setMarketingPreview(result.data.previewDataUrl);
    });
  }

  function confirmMarketing() {
    if (!marketingPreview) return;
    runAction("marketing-commit", async () => {
      const result = await commitMarketingImage({
        adId,
        previewDataUrl: marketingPreview,
        title: asText(titre).trim(),
      });
      if (result.error || !result.data) {
        toast.error(result.error ?? "Impossible d’enregistrer l’image.");
        return;
      }
      setImages((prev) => [
        ...prev,
        {
          id: result.data!.adImageId,
          url: result.data!.imageUrl,
          ordre: prev.length,
          est_principale: false,
          storage_path: null,
        },
      ]);
      setMarketingPreview(null);
      toast.success("Cadre appliqué à l’annonce");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/dashboard/annonces">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Annonces
          </Link>
        </Button>
        <Badge variant="secondary">{statusLabelFr(initial.statut)}</Badge>
      </div>

      {initial.statut === "PUBLISHED" && (
        <div className="rounded-[var(--ss-radius)] border border-[var(--ss-success)]/30 bg-[var(--ss-success-bg)] px-4 py-3 text-sm text-[var(--ss-text)]">
          <p className="font-medium text-[var(--ss-success)]">
            Annonce publiée sur eBay
          </p>
          <p className="mt-1 text-[var(--ss-text-muted)]">
            Elle est visible dans votre compte vendeur eBay.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ebayListingUrl ? (
              <Button asChild size="sm">
                <a href={ebayListingUrl} target="_blank" rel="noopener noreferrer">
                  Voir l’annonce
                </a>
              </Button>
            ) : null}
            {ebaySellerListingsUrl ? (
              <Button asChild size="sm" variant="outline">
                <a
                  href={ebaySellerListingsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ouvrir mon compte eBay
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      )}

      <Card className="shadow-xs overflow-hidden">
        <div className="bg-muted">
          {primary ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={primary.url}
              alt={asText(titre) || "Produit"}
              className="mx-auto max-h-[380px] w-full object-contain"
            />
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              Aucune image principale
            </div>
          )}
        </div>
        <CardContent className="space-y-4 pt-5">
          <div className="space-y-2">
            <Label htmlFor="field-titre">Titre</Label>
            <Input
              id="field-titre"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              maxLength={80}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="field-prix">
              Prix {currency ? `(${currency})` : "(€)"}
            </Label>
            <Input
              id="field-prix"
              ref={priceRef}
              inputMode="decimal"
              placeholder="ex. 12 ou 12,50"
              value={prix}
              onChange={(e) => setPrix(e.target.value)}
              onBlur={() => {
                const normalized = formatPriceForStorage(prix);
                if (normalized) setPrix(normalized);
              }}
              className={priceMissing ? "border-amber-500" : undefined}
            />
            {priceMissing ? (
              <p className="text-sm text-amber-700 dark:text-amber-400">
                {priceWarning?.trim() || PRICE_NOT_DETECTED_MESSAGE}
              </p>
            ) : null}
          </div>
          {resolution?.categoryName && (
            <p className="text-sm text-muted-foreground">
              Catégorie : {resolution.categoryName}
              {typeof resolution.confidence === "number"
                ? ` · ${Math.round(resolution.confidence * 100)} %`
                : ""}
            </p>
          )}
          {missingAspectNames.length > 0 && (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              À compléter : {missingAspectNames.join(", ")}
            </p>
          )}
          {identification &&
            (identification.soldItem?.name ||
              identification.model ||
              identification.partNumber ||
              identification.soldItem?.type) && (
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm space-y-1">
                <p className="font-medium text-foreground">
                  Identification photo
                  {typeof identification.confidence?.global === "number"
                    ? ` · ${Math.round(identification.confidence.global * 100)} %`
                    : ""}
                  {identification.needsReview ? " · à vérifier" : ""}
                </p>
                {identification.soldItem?.type ? (
                  <p className="text-muted-foreground">
                    Type : {identification.soldItem.type}
                  </p>
                ) : null}
                {identification.model || identification.partNumber ? (
                  <p className="text-muted-foreground">
                    Modèle / réf. :{" "}
                    {[identification.model, identification.partNumber]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                ) : null}
                {identification.compatibility?.brand ||
                identification.compatibility?.device ||
                identification.compatibility?.modelNumber ? (
                  <p className="text-muted-foreground">
                    Compatibilité :{" "}
                    {[
                      identification.compatibility?.brand,
                      identification.compatibility?.device,
                      identification.compatibility?.modelNumber,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  </p>
                ) : null}
                {identification.warnings?.[0] ? (
                  <p className="text-amber-700 dark:text-amber-400">
                    {identification.warnings[0]}
                  </p>
                ) : null}
              </div>
            )}
        </CardContent>
      </Card>

      {initialAspectFields.length > 0 && (
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Caractéristiques eBay
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {initialAspectFields.map((field) => {
              const value = aspectValues[field.name] ?? "";
              const emptyRequired = field.required && !value.trim();
              const listId = `aspect-suggestions-${field.name.replace(/\s+/g, "-")}`;
              return (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={`aspect-${field.name}`}>
                    {field.name}
                    {field.required ? (
                      <span className="text-destructive"> *</span>
                    ) : null}
                  </Label>
                  <Input
                    id={`aspect-${field.name}`}
                    list={field.values.length > 0 ? listId : undefined}
                    value={value}
                    placeholder={
                      emptyRequired ? `Renseigner ${field.name}` : undefined
                    }
                    onChange={(e) => setAspectValue(field.name, e.target.value)}
                    className={emptyRequired ? "border-amber-500" : undefined}
                  />
                  {field.values.length > 0 ? (
                    <datalist id={listId}>
                      {field.values.map((v) => (
                        <option key={v} value={v} />
                      ))}
                    </datalist>
                  ) : null}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card className="shadow-xs">
        <CardContent className="pt-6">
          <AdImagesPanel
            adId={adId}
            images={images}
            onImagesChange={setImages}
            disabled={pending}
          />
        </CardContent>
      </Card>

      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            variant="outline"
            disabled={pending || !primary || !asText(titre).trim()}
            onClick={generateMarketing}
            aria-busy={pendingAction === "marketing-image"}
          >
            {pendingAction === "marketing-image" ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <ImageIcon aria-hidden="true" />
            )}
            Générer avec mon cadre
          </Button>
          <Button onClick={save} disabled={pending}>
            {pendingAction === "save" ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Save aria-hidden="true" />
            )}
            Enregistrer l’annonce
          </Button>
          <PublishDialog
            adId={adId}
            adTitle={asText(titre)}
            validation={publishValidation}
            beforePublish={persistCurrentFields}
          />
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(marketingPreview)}
        onOpenChange={(open) => {
          if (!open) setMarketingPreview(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Aperçu de mon cadre</DialogTitle>
            <DialogDescription>
              Validez pour ajouter cette image à l’annonce, ou annulez.
            </DialogDescription>
          </DialogHeader>
          {marketingPreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={marketingPreview}
              alt="Aperçu cadre entreprise"
              className="mx-auto max-h-[min(52vh,420px)] w-auto max-w-full rounded-lg object-contain"
            />
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setMarketingPreview(null)}
              disabled={pending}
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={confirmMarketing}
              disabled={pending}
              aria-busy={pendingAction === "marketing-commit"}
            >
              {pendingAction === "marketing-commit" ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : null}
              Ajouter à l’annonce
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
