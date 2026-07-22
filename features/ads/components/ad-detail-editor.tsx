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
import { APP_NAME } from "@/lib/brand";
import type { AdValidationResult } from "@/features/ads/validation";

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
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const priceRef = useRef<HTMLInputElement>(null);

  const [titre, setTitre] = useState(() => asText(initial.titre));
  const [prix, setPrix] = useState(() => asText(initial.prix_vente));
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
    setImages([...initialImages].sort((a, b) => a.ordre - b.ordre));
  }, [initialImages]);

  const priceMissing = !prix || Number(prix) <= 0;
  const primary =
    images.find((i) => i.est_principale) ?? images[0] ?? null;

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

    if (!priceText || Number(priceText) <= 0) {
      errors.push({
        field: "prix_vente",
        message: "Le prix de vente est obligatoire.",
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

    return {
      valid: errors.length === 0,
      errors,
      warnings: validation.warnings ?? [],
    };
  }, [validation, titre, prix, images]);

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

  function save() {
    runAction("save", async () => {
      const result = await updateAd(adId, {
        titre: asText(titre).trim() || null,
        prix_vente: asText(prix).trim() || null,
        description: asText(initial.description).trim() || null,
        quantite: Math.max(1, Number(initial.quantite) || 1),
        ebay_condition_id: asText(initial.ebay_condition_id).trim() || null,
        sku: asText(initial.sku).trim() || null,
        ebay_category_id: asText(initial.ebay_category_id).trim() || null,
      });
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
        toast.error(result.error ?? `Échec de la génération ${APP_NAME}.`);
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
      toast.success(`Image ${APP_NAME} ajoutée à l’annonce`);
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
              type="number"
              min="0"
              step="0.01"
              value={prix}
              onChange={(e) => setPrix(e.target.value)}
              className={priceMissing ? "border-amber-500" : undefined}
            />
          </div>
          {resolution?.categoryName && (
            <p className="text-sm text-muted-foreground">
              Catégorie : {resolution.categoryName}
              {typeof resolution.confidence === "number"
                ? ` · ${Math.round(resolution.confidence * 100)} %`
                : ""}
            </p>
          )}
        </CardContent>
      </Card>

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
            Générer image {APP_NAME}
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
            <DialogTitle>Aperçu image {APP_NAME}</DialogTitle>
            <DialogDescription>
              Validez pour ajouter cette image à l’annonce, ou annulez.
            </DialogDescription>
          </DialogHeader>
          {marketingPreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={marketingPreview}
              alt={`Aperçu ${APP_NAME}`}
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
