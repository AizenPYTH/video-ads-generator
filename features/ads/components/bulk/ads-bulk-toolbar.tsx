"use client";

import {
  Archive,
  FileImage,
  Pencil,
  Shield,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  selectedCount: number;
  disabled?: boolean;
  onPublish: () => void;
  onEditPriceQty: () => void;
  onCommonImage: () => void;
  onMatchImages: () => void;
  onApplyPolicies: () => void;
  onDraft: () => void;
  onArchive: () => void;
  onDelete: () => void;
  className?: string;
};

export function AdsBulkToolbar({
  selectedCount,
  disabled,
  onPublish,
  onEditPriceQty,
  onCommonImage,
  onMatchImages,
  onApplyPolicies,
  onDraft,
  onArchive,
  onDelete,
  className,
}: Props) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        "sticky top-0 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-white/95 px-3 py-2.5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/80",
        className,
      )}
      role="toolbar"
      aria-label="Actions groupées"
    >
      <p className="mr-2 text-sm font-medium text-foreground">
        {selectedCount} sélectionnée{selectedCount > 1 ? "s" : ""}
      </p>
      <Button size="sm" disabled={disabled} onClick={onPublish}>
        <Upload className="h-4 w-4" />
        Publier
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={onEditPriceQty}
      >
        <Pencil className="h-4 w-4" />
        Prix / qté
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={onCommonImage}
      >
        <FileImage className="h-4 w-4" />
        Image commune
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={onMatchImages}
      >
        Associer images
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={onApplyPolicies}
      >
        <Shield className="h-4 w-4" />
        Politiques
      </Button>
      <Button size="sm" variant="outline" disabled={disabled} onClick={onDraft}>
        Brouillon
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={onArchive}
      >
        <Archive className="h-4 w-4" />
        Archiver
      </Button>
      <Button
        size="sm"
        variant="destructive"
        disabled={disabled}
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4" />
        Supprimer
      </Button>
    </div>
  );
}
