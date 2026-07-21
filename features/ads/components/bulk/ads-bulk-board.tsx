"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { getStatusLabel } from "@/features/ads/status";
import { AdRowImageDrop } from "./ad-row-image-drop";
import { AdsBulkToolbar } from "./ads-bulk-toolbar";
import { BulkPublishDialog } from "./bulk-publish-dialog";
import { BulkImageMatchDialog } from "./bulk-image-match-dialog";
import {
  SaveStatusIndicator,
  type SaveStatus,
} from "./save-status-indicator";
import {
  bulkApplyDefaultPoliciesFlag,
  bulkArchiveAds,
  bulkDeleteAds,
  bulkSetDraftAds,
  bulkUpdateAds,
} from "@/features/ads/bulk-actions";
import { uploadImageWithPath } from "@/components/uploads/upload-image";
import { addAdImages } from "@/features/ads/actions";
import { cn } from "@/lib/utils";
import type { AdStatus } from "@/types/ads";

export type BulkAdRow = {
  id: string;
  titre: string | null;
  sku: string | null;
  prix_vente: string | null;
  quantite: number;
  statut: AdStatus;
  categoryName: string | null;
  imageUrl: string | null;
  hasImage: boolean;
  mpn: string | null;
  listingUrl: string | null;
};

type Props = {
  ads: BulkAdRow[];
  isSandbox?: boolean;
};

export function AdsBulkBoard({ ads: initialAds, isSandbox = true }: Props) {
  const router = useRouter();
  const [ads, setAds] = useState(initialAds);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [publishOpen, setPublishOpen] = useState(false);
  const [matchOpen, setMatchOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkQty, setBulkQty] = useState("1");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [commonBusy, setCommonBusy] = useState(false);
  const commonInputRef = useRef<HTMLInputElement>(null);

  // Sync when server props change
  useEffect(() => {
    setAds(initialAds);
  }, [initialAds]);

  const allSelected =
    ads.length > 0 && ads.every((ad) => selected.has(ad.id));

  const toggleAll = useCallback(() => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(ads.map((a) => a.id)));
  }, [ads, allSelected]);

  const toggleOne = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectedIds = useMemo(() => [...selected], [selected]);

  function patchLocal(
    id: string,
    patch: Partial<Pick<BulkAdRow, "prix_vente" | "quantite" | "imageUrl" | "hasImage" | "statut">>,
  ) {
    setAds((prev) =>
      prev.map((ad) => (ad.id === id ? { ...ad, ...patch } : ad)),
    );
    setSaveStatus("dirty");
  }

  function flushPriceQty(id: string, prix: string, qty: number) {
    setSaveStatus("saving");
    startTransition(async () => {
      const result = await bulkUpdateAds([
        { id, prix_vente: prix || null, quantite: qty },
      ]);
      if (result.error) {
        setSaveStatus("error");
        toast.error(result.error);
        return;
      }
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    });
  }

  async function applyCommonImage(file: File) {
    if (!selectedIds.length) return;
    setCommonBusy(true);
    let ok = 0;
    let fail = 0;
    for (const id of selectedIds) {
      try {
        const uploaded = await uploadImageWithPath(file, `ads/${id}`);
        const result = await addAdImages(id, [
          { url: uploaded.url, storagePath: uploaded.path },
        ]);
        if (result.error || !result.data?.[0]) {
          fail += 1;
          continue;
        }
        ok += 1;
        patchLocal(id, {
          imageUrl: result.data[0].url,
          hasImage: true,
        });
      } catch {
        fail += 1;
      }
    }
    setCommonBusy(false);
    toast.success(`${ok} image(s) ajoutée(s), ${fail} échec(s).`);
    setSaveStatus("saved");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SaveStatusIndicator status={saveStatus} />
        {isSandbox ? (
          <p className="text-xs text-muted-foreground">
            Sandbox FR — annonces sur{" "}
            <a
              href="https://www.sandbox.ebay.fr/sh/lst/active"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              sandbox.ebay.fr
            </a>
            , pas ebay.com
          </p>
        ) : null}
      </div>

      <AdsBulkToolbar
        selectedCount={selected.size}
        disabled={pending || commonBusy}
        onPublish={() => setPublishOpen(true)}
        onEditPriceQty={() => setPriceOpen(true)}
        onCommonImage={() => commonInputRef.current?.click()}
        onMatchImages={() => setMatchOpen(true)}
        onApplyPolicies={() => {
          startTransition(async () => {
            const r = await bulkApplyDefaultPoliciesFlag(selectedIds);
            if (r.error) toast.error(r.error);
            else toast.success("Politiques par défaut marquées.");
          });
        }}
        onDraft={() => {
          startTransition(async () => {
            const r = await bulkSetDraftAds(selectedIds);
            if (r.error) toast.error(r.error);
            else {
              toast.success("Passées en brouillon.");
              setAds((prev) =>
                prev.map((ad) =>
                  selected.has(ad.id) ? { ...ad, statut: "DRAFT" } : ad,
                ),
              );
            }
          });
        }}
        onArchive={() => {
          startTransition(async () => {
            const r = await bulkArchiveAds(selectedIds);
            if (r.error) toast.error(r.error);
            else {
              toast.success("Annonces archivées.");
              router.refresh();
            }
          });
        }}
        onDelete={() => setDeleteOpen(true)}
      />

      <input
        ref={commonInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void applyCommonImage(file);
        }}
      />

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border bg-card shadow-sm md:block">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="w-10 px-3 py-3">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Tout sélectionner"
                />
              </th>
              <th className="px-2 py-3">Image</th>
              <th className="px-3 py-3">Titre</th>
              <th className="px-3 py-3">SKU</th>
              <th className="px-3 py-3">Prix</th>
              <th className="px-3 py-3">Qté</th>
              <th className="px-3 py-3">Catégorie</th>
              <th className="px-3 py-3">Statut</th>
              <th className="px-3 py-3"> </th>
            </tr>
          </thead>
          <tbody>
            {ads.map((ad) => (
              <tr
                key={ad.id}
                className={cn(
                  "border-b last:border-0 hover:bg-accent/40",
                  selected.has(ad.id) && "bg-accent/50",
                )}
              >
                <td className="px-3 py-2 align-middle">
                  <Checkbox
                    checked={selected.has(ad.id)}
                    onCheckedChange={() => toggleOne(ad.id)}
                    aria-label={`Sélectionner ${ad.titre ?? ad.sku ?? ad.id}`}
                  />
                </td>
                <td className="px-2 py-2 align-middle">
                  <AdRowImageDrop
                    adId={ad.id}
                    imageUrl={ad.imageUrl}
                    hasImage={ad.hasImage}
                    disabled={pending}
                    onUploaded={(url) =>
                      patchLocal(ad.id, { imageUrl: url, hasImage: true })
                    }
                  />
                  {!ad.hasImage ? (
                    <p className="mt-1 text-[10px] text-amber-700">Manquante</p>
                  ) : null}
                </td>
                <td className="max-w-[220px] px-3 py-2 align-middle">
                  <Link
                    href={`/dashboard/annonces/${ad.id}`}
                    className="line-clamp-2 font-medium text-primary hover:underline"
                  >
                    {ad.titre ?? "Sans titre"}
                  </Link>
                </td>
                <td className="px-3 py-2 align-middle font-mono text-xs text-muted-foreground">
                  {ad.sku ?? "—"}
                </td>
                <td className="px-3 py-2 align-middle">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    className="h-8 w-24"
                    value={ad.prix_vente ?? ""}
                    onChange={(e) =>
                      patchLocal(ad.id, { prix_vente: e.target.value })
                    }
                    onBlur={(e) =>
                      flushPriceQty(
                        ad.id,
                        e.target.value,
                        Math.max(1, ad.quantite || 1),
                      )
                    }
                  />
                </td>
                <td className="px-3 py-2 align-middle">
                  <Input
                    type="number"
                    min="1"
                    className="h-8 w-16"
                    value={ad.quantite}
                    onChange={(e) =>
                      patchLocal(ad.id, {
                        quantite: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                    onBlur={(e) =>
                      flushPriceQty(
                        ad.id,
                        ad.prix_vente ?? "",
                        Math.max(1, Number(e.target.value) || 1),
                      )
                    }
                  />
                </td>
                <td className="max-w-[140px] truncate px-3 py-2 align-middle text-xs text-muted-foreground">
                  {ad.categoryName ?? "—"}
                </td>
                <td className="px-3 py-2 align-middle">
                  <Badge variant="secondary" className="font-normal">
                    {getStatusLabel(ad.statut)}
                  </Badge>
                </td>
                <td className="px-3 py-2 align-middle">
                  <div className="flex items-center gap-1">
                    {ad.listingUrl ? (
                      <Button variant="ghost" size="icon" asChild>
                        <a
                          href={ad.listingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Voir sur eBay"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    ) : null}
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/dashboard/annonces/${ad.id}`}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-3 md:hidden">
        {ads.map((ad) => (
          <li
            key={ad.id}
            className={cn(
              "rounded-xl border bg-card p-3 shadow-sm",
              selected.has(ad.id) && "ring-2 ring-primary/30",
            )}
          >
            <div className="flex gap-3">
              <Checkbox
                checked={selected.has(ad.id)}
                onCheckedChange={() => toggleOne(ad.id)}
                className="mt-1"
              />
              <AdRowImageDrop
                adId={ad.id}
                imageUrl={ad.imageUrl}
                hasImage={ad.hasImage}
                onUploaded={(url) =>
                  patchLocal(ad.id, { imageUrl: url, hasImage: true })
                }
              />
              <div className="min-w-0 flex-1 space-y-1">
                <Link
                  href={`/dashboard/annonces/${ad.id}`}
                  className="line-clamp-2 text-sm font-medium"
                >
                  {ad.titre ?? "Sans titre"}
                </Link>
                <p className="font-mono text-xs text-muted-foreground">
                  {ad.sku ?? "—"}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{getStatusLabel(ad.statut)}</Badge>
                  {!ad.hasImage ? (
                    <span className="text-[10px] text-amber-700">
                      Image manquante
                    </span>
                  ) : null}
                </div>
                <div className="flex gap-2 pt-1">
                  <Input
                    type="number"
                    className="h-8 w-24"
                    value={ad.prix_vente ?? ""}
                    onChange={(e) =>
                      patchLocal(ad.id, { prix_vente: e.target.value })
                    }
                    onBlur={(e) =>
                      flushPriceQty(
                        ad.id,
                        e.target.value,
                        Math.max(1, ad.quantite || 1),
                      )
                    }
                  />
                  <Input
                    type="number"
                    className="h-8 w-16"
                    value={ad.quantite}
                    onChange={(e) =>
                      patchLocal(ad.id, {
                        quantite: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                    onBlur={(e) =>
                      flushPriceQty(
                        ad.id,
                        ad.prix_vente ?? "",
                        Math.max(1, Number(e.target.value) || 1),
                      )
                    }
                  />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <BulkPublishDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        adIds={selectedIds}
        onDone={() => router.refresh()}
      />

      <BulkImageMatchDialog
        open={matchOpen}
        onOpenChange={setMatchOpen}
        ads={ads.map((a) => ({
          id: a.id,
          titre: a.titre,
          sku: a.sku,
          mpn: a.mpn,
        }))}
        onDone={() => router.refresh()}
      />

      <Dialog open={priceOpen} onOpenChange={setPriceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier prix / quantité</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-muted-foreground">Prix (€)</label>
              <Input
                value={bulkPrice}
                onChange={(e) => setBulkPrice(e.target.value)}
                type="number"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Quantité</label>
              <Input
                value={bulkQty}
                onChange={(e) => setBulkQty(e.target.value)}
                type="number"
                min="1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPriceOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => {
                startTransition(async () => {
                  const patches = selectedIds.map((id) => ({
                    id,
                    ...(bulkPrice !== ""
                      ? { prix_vente: bulkPrice }
                      : {}),
                    ...(bulkQty !== ""
                      ? { quantite: Math.max(1, Number(bulkQty) || 1) }
                      : {}),
                  }));
                  const r = await bulkUpdateAds(patches);
                  if (r.error) toast.error(r.error);
                  else {
                    toast.success("Modifications enregistrées.");
                    setAds((prev) =>
                      prev.map((ad) =>
                        selected.has(ad.id)
                          ? {
                              ...ad,
                              ...(bulkPrice !== ""
                                ? { prix_vente: bulkPrice }
                                : {}),
                              ...(bulkQty !== ""
                                ? {
                                    quantite: Math.max(
                                      1,
                                      Number(bulkQty) || 1,
                                    ),
                                  }
                                : {}),
                            }
                          : ad,
                      ),
                    );
                    setPriceOpen(false);
                  }
                });
              }}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Supprimer la sélection ?"
        description="Les annonces déjà publiées sur eBay ne seront pas supprimées. Cette action est irréversible pour les brouillons."
        confirmLabel="Supprimer"
        onConfirm={async () => {
          const r = await bulkDeleteAds(selectedIds);
          if (r.error) toast.error(r.error);
          else {
            toast.success(
              `${r.data?.deleted ?? 0} supprimée(s)${
                r.data?.skippedPublished
                  ? `, ${r.data.skippedPublished} publiée(s) ignorée(s)`
                  : ""
              }.`,
            );
            setSelected(new Set());
            setDeleteOpen(false);
            router.refresh();
          }
        }}
      />
    </div>
  );
}
