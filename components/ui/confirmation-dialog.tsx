"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingButton } from "@/components/ui/loading-button";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}

function ConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  destructive = false,
  loading: controlledLoading,
}: ConfirmationDialogProps) {
  const [internalLoading, setInternalLoading] = React.useState(false);
  const loading = controlledLoading ?? internalLoading;

  async function handleConfirm() {
    if (loading) return;

    setInternalLoading(true);
    try {
      await onConfirm();
    } finally {
      setInternalLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={loading ? undefined : onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <AlertTriangle className="size-5" aria-hidden="true" />
          </div>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription asChild>
            <div>{description}</div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <LoadingButton
            type="button"
            variant={destructive ? "destructive" : "default"}
            loading={loading}
            loadingText={confirmLabel}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { ConfirmationDialog, type ConfirmationDialogProps };
