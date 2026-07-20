import Link from "next/link";
import { Suspense } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { PlusCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ads/empty-state";
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
  title: "Imports — SNOWOLF",
};

const STATUS_LABELS: Record<ImportBatchStatut, string> = {
  PENDING: "En attente",
  PROCESSING: "En cours",
  COMPLETED: "Terminé",
  FAILED: "Échoué",
  PARTIAL: "Partiel",
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
        title="Aucun import"
        description="Importez un fichier CSV ou Excel pour créer plusieurs annonces d'un coup."
        actionLabel="Importer un fichier"
        actionHref="/dashboard/creer/import"
      />
    );
  }

  return (
    <div className="rounded-xl border">
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
            <TableRow key={batch.id}>
              <TableCell className="font-medium">{batch.nom_fichier}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[statut]}>
                  {STATUS_LABELS[statut]}
                </Badge>
              </TableCell>
              <TableCell>
                {batch.lignes_reussies}/{batch.nombre_lignes}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(batch.created_at), "d MMM yyyy", { locale: fr })}
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/dashboard/imports/${batch.id}`}>Voir</Link>
                </Button>
              </TableCell>
            </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export default function ImportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Imports</h1>
          <p className="text-muted-foreground">
            Historique de vos imports CSV et Excel
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/creer/import">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nouvel import
          </Link>
        </Button>
      </div>

      <Suspense fallback={<Skeleton className="h-64 rounded-xl" />}>
        <ImportsList />
      </Suspense>
    </div>
  );
}
