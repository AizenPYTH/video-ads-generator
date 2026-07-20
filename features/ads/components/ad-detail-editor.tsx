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
};

export function AdDetailEditor({
  adId,
  initial,
  images: initialImages,
  resolution,
  validation,
  currency,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const priceRef = useRef<HTMLInputElement>(null);

  const [titre, setTitre] = useState(initial.titre);
  const [prix, setPrix] = useState(initial.prix_vente);
  const [images, setImages] = useState<EditorAdImage[]>(() =>
    [...initialImages].sort((a, b) => a.ordre - b.ordre),
  );
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [marketingPreview, setMarketingPreview] = useState<string | null>(null);

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
    const errors = [...validation.errors];
    if (!titre.trim() && !errors.some((e) => e.field === "titre")) {
      errors.push({ field: "titre", message: "Le titre est obligatoire." });
    }
    if (
      (!prix || Number(prix) <= 0) &&
      !errors.some((e) => e.field === "prix_vente")
    ) {
      errors.push({
        field: "prix_vente",
        message: "Le prix de vente est obligatoire.",
      });
    }
    return {
      ...validation,
      valid: errors.length === 0,
      errors,
    };
  }, [validation, titre, prix]);

  function runAction(action: string, task: () => Promise<void>) {
    setPendingAction(action);
    startTransition(async () => {
      try {
        await task();
      } finally {
        setPendingAction(null);
      }
    });
  }

  function save() {
    runAction("save", async () => {
      const result = await updateAd(adId, {
        titre: titre.trim() || null,
        prix_vente: prix.trim() || null,
        description: initial.description || null,
        quantite: Math.max(1, initial.quantite || 1),
        ebay_condition_id: initial.ebay_condition_id || null,
        sku: initial.sku || null,
        ebay_category_id: initial.ebay_category_id || null,
      });
      if (result.error) {
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
    if (!titre.trim()) {
      toast.error("Indiquez un titre avant de générer l’image.");
      return;
    }
    runAction("marketing-image", async () => {
      const result = await previewMarketingImage({
        adId,
        productImageUrl: primary.url,
        storagePath: primary.storage_path,
        title: titre,
        price: prix || undefined,
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
        title: titre,
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

      {/* Aperçu produit */}
      <Card className="shadow-xs overflow-hidden">
        <div className="bg-muted">
          {primary ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={primary.url}
              alt={titre || "Produit"}
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

      {/* Images */}
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

      {/* Actions */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            variant="outline"
            disabled={pending || !primary || !titre.trim()}
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
            adTitle={titre}
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
        <DialogContent className="max-w-xl">
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
              className="mx-auto max-h-[60vh] w-full rounded-lg object-contain"
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
