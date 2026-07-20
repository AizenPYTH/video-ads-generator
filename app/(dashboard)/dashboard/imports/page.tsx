import Link from "next/link";
import { Suspense } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowRight, FileSpreadsheet, PlusCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ads/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ImportBatchStatut } from "@/types/database";

export const metadata = {
  title: "Imports — Smart Seller",
};

const STATUS_LABELS: Record<ImportBatchStatut, string> = {
  PENDING: "Analyse en cours",
  PROCESSING: "Analyse en cours",
  COMPLETED: "Import terminé",
  FAILED: "Une erreur est survenue",
  PARTIAL: "Import terminé",
};

const STATUS_VARIANT: Record<
  ImportBatchStatut,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING: "secondary",
  PROCESSING: "outline",
  COMPLETED: "default",
  FAILED: "destructive",
  PARTIAL: "secondary",
};

function getStatusLabel(statut: ImportBatchStatut, failedRows: number): string {
  if (statut === "PARTIAL") {
    return `${failedRows} ligne${failedRows > 1 ? "s" : ""} à corriger`;
  }
  return STATUS_LABELS[statut];
}

async function ImportsList() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: batches } = await supabase
    .from("product_import_batches")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!batches?.length) {
    return (
      <EmptyState
        title="Aucun import pour le moment"
        description="Ajoutez un fichier CSV ou Excel pour préparer plusieurs annonces en une seule fois."
        actionLabel="Importer un fichier"
        actionHref="/dashboard/creer/import"
        icon={<FileSpreadsheet className="h-7 w-7" />}
      />
    );
  }

  return (
    <>
      <div className="grid gap-3 md:hidden">
        {batches.map((batch) => {
          const statut = batch.statut as ImportBatchStatut;
          const completed = batch.lignes_reussies + batch.lignes_echouees;
          return (
            <Link
              key={batch.id}
              href={`/dashboard/imports/${batch.id}`}
              className="rounded-xl border bg-card p-4 shadow-xs outline-none transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{batch.nom_fichier}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {format(new Date(batch.created_at), "d MMM yyyy 'à' HH:mm", {
                      locale: fr,
                    })}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[statut]}>
                  {getStatusLabel(statut, batch.lignes_echouees)}
                </Badge>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {completed} sur {batch.nombre_lignes} lignes traitées
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="hidden overflow-hidden rounded-xl border bg-card shadow-xs md:block">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fichier</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Lignes</TableHead>
            <TableHead>Date</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {batches.map((batch) => {
            const statut = batch.statut as ImportBatchStatut;
            return (
            <TableRow key={batch.id} className="group">
              <TableCell className="max-w-[320px] truncate font-medium">
                {batch.nom_fichier}
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[statut]}>
                  {getStatusLabel(statut, batch.lignes_echouees)}
                </Badge>
              </TableCell>
              <TableCell>
                {batch.lignes_reussies} réussies sur {batch.nombre_lignes}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(batch.created_at), "d MMM yyyy", { locale: fr })}
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/dashboard/imports/${batch.id}`}>
                    Consulter
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
            );
          })}
        </TableBody>
        </Table>
      </div>
    </>
  );
}

export default function ImportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Imports"
        description="Suivez vos fichiers et retrouvez les annonces préparées."
      >
        <Button asChild>
          <Link href="/dashboard/creer/import">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nouvel import
          </Link>
        </Button>
      </PageHeader>

      <Suspense
        fallback={
          <div className="space-y-3">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
        }
      >
        <ImportsList />
      </Suspense>
    </div>
  );
}
