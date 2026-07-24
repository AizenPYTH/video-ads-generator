"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ProductImportRowsRow } from "@/types/database";
import { updateImportAdCategory } from "@/features/imports/actions";
import { publishAd } from "@/features/ebay/publish";

type ImportTableProps = {
  rows: ProductImportRowsRow[];
};

/** Seuil UI : bloc « fiables » vs « à vérifier ». */
const RELIABLE_CONFIDENCE = 0.9;

const ROW_STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  SUCCESS: "Traité",
  FAILED: "Erreur",
  SKIPPED: "Ignoré",
  ERROR: "Erreur",
  READY: "Prêt à publier",
  NEEDS_REVIEW: "À vérifier",
};

type CategoryResolution = {
  status?: string;
  categoryId?: string | null;
  categoryName?: string | null;
  rootCategoryName?: string | null;
  subcategoryName?: string | null;
  confidence?: number;
  taxonomySource?: string;
  alternatives?: Array<{
    categoryId: string;
    categoryName: string;
    confidence: number;
  }>;
  missingAspects?: string[];
  message?: string;
};

type PreparedRow = {
  row: ProductImportRowsRow;
  data: Record<string, unknown>;
  title: string;
  resolution: CategoryResolution;
  confidence: number;
  reliable: boolean;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function getTitle(data: Record<string, unknown>): string {
  return String(data.titre ?? data.Title ?? "—");
}

function getResolution(data: Record<string, unknown>): CategoryResolution {
  return asRecord(data.category_resolution) as CategoryResolution;
}

function confidenceLabel(value?: number): string {
  if (value == null) return "—";
  return `${Math.round(value * 100)} %`;
}

type DetectedSpecific = { key: string; value: string; source?: string };

function getDetectedSpecifics(data: Record<string, unknown>): DetectedSpecific[] {
  const raw = data.detected_specifics;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (s): s is DetectedSpecific =>
        Boolean(s) &&
        typeof s === "object" &&
        typeof (s as DetectedSpecific).key === "string" &&
        typeof (s as DetectedSpecific).value === "string",
    )
    .slice(0, 12);
}

function getMissingUsefulFields(data: Record<string, unknown>): string[] {
  const raw = data.missing_useful_fields;
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === "string").slice(0, 10);
}

function SpecificsPreview({ data }: { data: Record<string, unknown> }) {
  const detected = getDetectedSpecifics(data);
  const missing = getMissingUsefulFields(data);
  const taxonomyMissing = (
    asRecord(data.category_resolution).missingAspects as string[] | undefined
  )?.filter(Boolean);

  if (detected.length === 0 && missing.length === 0 && !taxonomyMissing?.length) {
    return (
      <p className="text-xs text-muted-foreground">
        Aucune caractéristique détectée dans le fichier.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {detected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {detected.map((s) => (
            <Badge
              key={`${s.key}-${s.value}`}
              variant="secondary"
              className="max-w-[220px] truncate font-normal"
              title={`${s.key}: ${s.value}${s.source ? ` (${s.source})` : ""}`}
            >
              {s.key}: {s.value}
            </Badge>
          ))}
        </div>
      )}
      {missing.length > 0 && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Manquants fichier : {missing.join(", ")}
        </p>
      )}
      {taxonomyMissing && taxonomyMissing.length > 0 && (
        <p className="text-xs text-destructive">
          Requis eBay catégorie : {taxonomyMissing.join(", ")}
        </p>
      )}
    </div>
  );
}

function CategoryCell({
  adId,
  resolution,
  compact,
}: {
  adId: string | null;
  resolution: CategoryResolution;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [choosingId, setChoosingId] = useState<string | null>(null);
  const alternatives = resolution.alternatives ?? [];

  async function choose(categoryId: string, categoryName: string) {
    if (!adId) {
      toast.error("Annonce non créée — impossible de modifier la catégorie.");
      return;
    }
    setChoosingId(categoryId);
    try {
      const result = await updateImportAdCategory(adId, categoryId, categoryName);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Catégorie mise à jour.");
      setOpen(false);
    } finally {
      setChoosingId(null);
    }
  }

  return (
    <div className="space-y-1 text-sm">
      <div>
        <span className="text-muted-foreground">Catégorie : </span>
        {resolution.categoryName || resolution.categoryId || "Non trouvée"}
      </div>
      {!compact && resolution.rootCategoryName && (
        <div>
          <span className="text-muted-foreground">Racine : </span>
          {resolution.rootCategoryName}
        </div>
      )}
      <div>
        <span className="text-muted-foreground">Confiance : </span>
        {confidenceLabel(resolution.confidence)}
      </div>
      {resolution.message && resolution.status === "needs_review" && (
        <div className="text-xs text-muted-foreground">{resolution.message}</div>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        {adId && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/annonces/${adId}`}>
              {compact ? "Corriger" : "Modifier"}
            </Link>
          </Button>
        )}
        {alternatives.length > 0 && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                Alternatives
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Autres catégories proposées</DialogTitle>
                <DialogDescription>
                  Choisissez la catégorie qui correspond le mieux à l’annonce.
                </DialogDescription>
              </DialogHeader>
              <ul className="space-y-2">
                {alternatives.map((alt) => (
                  <li
                    key={alt.categoryId}
                    className="flex items-center justify-between gap-2 rounded border p-2"
                  >
                    <div>
                      <p className="font-medium">{alt.categoryName}</p>
                      <p className="text-xs text-muted-foreground">
                        Confiance {confidenceLabel(alt.confidence)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      disabled={choosingId !== null || !adId}
                      onClick={() => choose(alt.categoryId, alt.categoryName)}
                      aria-busy={choosingId === alt.categoryId}
                    >
                      {choosingId === alt.categoryId && (
                        <Loader2 className="animate-spin" aria-hidden="true" />
                      )}
                      Choisir
                    </Button>
                  </li>
                ))}
              </ul>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}

function RowBlock({
  title,
  description,
  items,
  mode,
}: {
  title: string;
  description: string;
  items: PreparedRow[];
  mode: "reliable" | "review";
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  if (items.length === 0) return null;

  const selectable = items.filter((i) => i.row.ad_id);
  const allSelected =
    selectable.length > 0 &&
    selectable.every((i) => selected.has(i.row.ad_id!));

  function toggle(adId: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(adId);
      else next.delete(adId);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    if (!checked) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(selectable.map((i) => i.row.ad_id!)));
  }

  function publishSelected() {
    const ids = [...selected];
    if (ids.length === 0) {
      toast.error("Sélectionnez au moins une annonce.");
      return;
    }
    startTransition(async () => {
      let ok = 0;
      let fail = 0;
      const errorCounts = new Map<string, number>();

      for (const adId of ids) {
        try {
          const result = await publishAd(adId);
          if (result.error) {
            fail++;
            const key = result.error.trim() || "Échec de publication.";
            errorCounts.set(key, (errorCounts.get(key) ?? 0) + 1);
          } else {
            ok++;
          }
        } catch (err) {
          fail++;
          const key =
            err instanceof Error ? err.message : "Échec de publication.";
          errorCounts.set(key, (errorCounts.get(key) ?? 0) + 1);
        }
      }

      if (ok > 0) {
        toast.success(
          `${ok} annonce${ok > 1 ? "s" : ""} publiée${ok > 1 ? "s" : ""}.`,
        );
      }

      if (fail > 0) {
        const parts = [...errorCounts.entries()].map(([message, count]) =>
          count > 1 ? `${message} (×${count})` : message,
        );
        const summary =
          fail === ids.length
            ? `${fail} annonce${fail > 1 ? "s" : ""} non publiée${fail > 1 ? "s" : ""}`
            : `${fail} échec${fail > 1 ? "s" : ""}`;
        toast.error([summary, ...parts].join(" — "), {
          duration: 8000,
        });
      }

      if (fail === 0) setSelected(new Set());
    });
  }

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {items.length} ligne{items.length > 1 ? "s" : ""}
          </p>
        </div>
        {mode === "reliable" && (
          <Button
            size="sm"
            disabled={pending || selected.size === 0}
            onClick={publishSelected}
            aria-busy={pending}
          >
            {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
            Publier la sélection
            {selected.size > 0 ? ` (${selected.size})` : ""}
          </Button>
        )}
      </div>

      <div className="divide-y md:hidden">
        {items.map(({ row, data, title: rowTitle, resolution, confidence }) => (
          <article key={row.id} className="space-y-3 p-4">
            <div className="flex items-start gap-3">
              {mode === "reliable" && row.ad_id && (
                <Checkbox
                  checked={selected.has(row.ad_id)}
                  onCheckedChange={(v) => toggle(row.ad_id!, v === true)}
                  aria-label={`Sélectionner ${rowTitle}`}
                  className="mt-1"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">
                      Ligne {row.numero_ligne}
                    </p>
                    <h4 className="mt-1 line-clamp-2 font-semibold">{rowTitle}</h4>
                  </div>
                  {mode === "review" ? (
                    <Badge variant="destructive" className="shrink-0">
                      À vérifier
                    </Badge>
                  ) : (
                    <Badge
                      className="shrink-0"
                      variant={
                        row.statut === "FAILED" ? "destructive" : "default"
                      }
                    >
                      {ROW_STATUS_LABELS[row.statut] ?? "Traité"}
                    </Badge>
                  )}
                </div>
                {mode === "review" && (
                  <p className="mt-2 text-sm text-destructive">
                    {resolution.message ||
                      `Confiance ${confidenceLabel(confidence)} — vérifiez la catégorie.`}
                  </p>
                )}
                {row.erreur && (
                  <div className="mt-2 rounded-lg bg-destructive/8 p-3 text-sm text-destructive">
                    <p className="whitespace-pre-wrap break-words">{row.erreur}</p>
                  </div>
                )}
                <div className="mt-2">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    Caractéristiques
                  </p>
                  <SpecificsPreview data={data} />
                </div>
                {row.statut === "SUCCESS" && (
                  <div className="mt-2">
                    <CategoryCell
                      adId={row.ad_id}
                      resolution={resolution}
                      compact={mode === "review"}
                    />
                  </div>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {mode === "reliable" && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(v) => toggleAll(v === true)}
                    aria-label="Tout sélectionner"
                    disabled={selectable.length === 0}
                  />
                </TableHead>
              )}
              <TableHead className="w-16">Ligne</TableHead>
              <TableHead>Titre</TableHead>
              <TableHead>Caractéristiques</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>
                {mode === "review" ? "Raison" : "Catégorie eBay"}
              </TableHead>
              {mode === "review" && <TableHead>Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(({ row, data, title: rowTitle, resolution, confidence }) => (
              <TableRow key={row.id} className="align-top">
                {mode === "reliable" && (
                  <TableCell>
                    {row.ad_id ? (
                      <Checkbox
                        checked={selected.has(row.ad_id)}
                        onCheckedChange={(v) => toggle(row.ad_id!, v === true)}
                        aria-label={`Sélectionner ${rowTitle}`}
                      />
                    ) : null}
                  </TableCell>
                )}
                <TableCell className="text-muted-foreground">
                  {row.numero_ligne}
                </TableCell>
                <TableCell className="max-w-[200px] font-medium">
                  <span className="line-clamp-2">{rowTitle}</span>
                </TableCell>
                <TableCell className="min-w-[220px] max-w-[320px] py-3">
                  <SpecificsPreview data={data} />
                </TableCell>
                <TableCell>
                  {mode === "review" ? (
                    <Badge variant="destructive">À vérifier</Badge>
                  ) : (
                    <Badge
                      variant={
                        row.statut === "FAILED" ? "destructive" : "default"
                      }
                    >
                      {ROW_STATUS_LABELS[row.statut] ?? "Traité"}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="min-w-[240px] py-3">
                  {mode === "review" ? (
                    <div className="space-y-1 text-sm">
                      <p className="text-destructive">
                        {resolution.message ||
                          `Confiance ${confidenceLabel(confidence)}`}
                      </p>
                      <p className="text-muted-foreground">
                        {resolution.categoryName || "Catégorie à confirmer"}
                      </p>
                    </div>
                  ) : row.statut === "SUCCESS" ? (
                    <CategoryCell adId={row.ad_id} resolution={resolution} />
                  ) : (
                    <span className="text-muted-foreground">
                      {row.erreur ?? "—"}
                    </span>
                  )}
                </TableCell>
                {mode === "review" && (
                  <TableCell>
                    {row.ad_id ? (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/annonces/${row.ad_id}`}>
                          Corriger
                        </Link>
                      </Button>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

export function ImportTable({ rows }: ImportTableProps) {
  const prepared = useMemo<PreparedRow[]>(
    () =>
      rows.map((row) => {
        const data = asRecord(row.donnees_brutes);
        const resolution = getResolution(data);
        const confidence =
          typeof resolution.confidence === "number" ? resolution.confidence : 0;
        return {
          row,
          data,
          title: getTitle(data),
          resolution,
          confidence,
          reliable: confidence > RELIABLE_CONFIDENCE,
        };
      }),
    [rows],
  );

  const reliable = prepared.filter((p) => p.reliable);
  const review = prepared.filter((p) => !p.reliable);

  return (
    <div className="space-y-6">
      <RowBlock
        title="Fiables — confiance > 90 %"
        description="Annonces avec une détection catégorie solide. Sélectionnez puis publiez."
        items={reliable}
        mode="reliable"
      />
      <RowBlock
        title="À vérifier — confiance ≤ 90 %"
        description="Ces lignes demandent une confirmation avant publication."
        items={review}
        mode="review"
      />
      {prepared.length === 0 && (
        <p className="p-6 text-center text-sm text-muted-foreground">
          Aucune ligne à afficher.
        </p>
      )}
    </div>
  );
}
