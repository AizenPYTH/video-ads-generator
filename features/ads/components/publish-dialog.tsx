"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { publishAd } from "@/features/ebay/publish";
import type { AdValidationResult } from "@/features/ads/validation";

type PublishDialogProps = {
  adId: string;
  adTitle?: string | null;
  validation: AdValidationResult;
  trigger?: React.ReactNode;
  onPublished?: () => void;
  /** Affiche l’avertissement sandbox dans la boîte de dialogue */
  sandbox?: boolean;
};

export function PublishDialog({
  adId,
  adTitle,
  validation,
  trigger,
  onPublished,
  sandbox = true,
}: PublishDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handlePublish() {
    if (!validation.valid) {
      toast.error("L'annonce n'est pas valide pour la publication.");
      return;
    }

    setIsLoading(true);
    const result = await publishAd(adId);

    if (result.error) {
      toast.error(result.error);
    } else {
      const listingUrl = result.data?.listingUrl;
      const sellerUrl = result.data?.sellerListingsUrl;
      toast.success(result.message ?? "Annonce publiée sur eBay.", {
        duration: 12_000,
        action:
          listingUrl || sellerUrl
            ? {
                label: "Ouvrir eBay",
                onClick: () => {
                  window.open(listingUrl ?? sellerUrl!, "_blank", "noopener,noreferrer");
                },
              }
            : undefined,
      });
      setOpen(false);
      onPublished?.();
      router.refresh();
    }
    setIsLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button disabled={!validation.valid}>Publier sur eBay</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmer la publication</DialogTitle>
          <DialogDescription>
            Vous allez publier l&apos;annonce
            {adTitle ? ` « ${adTitle} »` : ""} sur eBay France
            {sandbox ? " (Sandbox / test)" : ""}.
          </DialogDescription>
        </DialogHeader>

        {sandbox ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            <p className="font-medium">Où voir l’annonce après publication ?</p>
            <p className="mt-1">
              Uniquement sur{" "}
              <a
                href="https://www.sandbox.ebay.fr"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                sandbox.ebay.fr
              </a>{" "}
              connecté avec le <strong>même compte test</strong> — pas sur
              ebay.fr (site réel).
            </p>
            <p className="mt-1">
              Puis :{" "}
              <a
                href="https://www.sandbox.ebay.fr/sh/lst/active"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Mes annonces (Sandbox)
              </a>
              .
            </p>
          </div>
        ) : null}

        {validation.errors.length > 0 && (
          <ul className="space-y-1 text-sm text-destructive" role="alert">
            {validation.errors.map((err) => (
              <li key={err.field}>• {err.message}</li>
            ))}
          </ul>
        )}

        {validation.warnings.length > 0 && (
          <ul className="space-y-1 text-sm text-amber-600">
            {validation.warnings.map((warning, i) => (
              <li key={i}>• {warning}</li>
            ))}
          </ul>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <LoadingButton
            onClick={handlePublish}
            loading={isLoading}
            loadingText="Publication en cours…"
            disabled={!validation.valid}
          >
            Confirmer
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
