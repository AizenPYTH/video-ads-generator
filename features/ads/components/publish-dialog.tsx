"use client";

import { useState } from "react";
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
};

export function PublishDialog({
  adId,
  adTitle,
  validation,
  trigger,
  onPublished,
}: PublishDialogProps) {
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
      toast.success("Annonce publiée sur eBay.");
      setOpen(false);
      onPublished?.();
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
            {adTitle ? ` « ${adTitle} »` : ""} sur eBay France.
          </DialogDescription>
        </DialogHeader>

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
