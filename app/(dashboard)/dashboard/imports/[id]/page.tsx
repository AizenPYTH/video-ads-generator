import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ImportTable } from "@/features/imports/components/import-table";
import { ImportProgress } from "@/features/imports/components/import-progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ImportBatchStatut } from "@/types/database";

export const metadata = {
  title: "Détail import — SNOWOLF",
};

const STATUS_LABELS: Record<ImportBatchStatut, string> = {
  PENDING: "En attente",
  PROCESSING: "En cours",
  COMPLETED: "Terminé",
  FAILED: "Échoué",
  PARTIAL: "Partiel",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ImportDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const { data: batch } = await supabase
    .from("product_import_batches")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!batch) notFound();

  const { data: rows } = await supabase
    .from("product_import_rows")
    .select("*")
    .eq("batch_id", id)
    .eq("user_id", user.id)
    .order("numero_ligne");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard/imports">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Imports
        </Link>
      </Button>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-navy-900">{batch.nom_fichier}</h1>
        <Badge>{STATUS_LABELS[batch.statut as ImportBatchStatut]}</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{batch.nombre_lignes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Réussies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {batch.lignes_reussies}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Échouées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">
              {batch.lignes_echouees}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {format(new Date(batch.created_at), "d MMM yyyy HH:mm", {
                locale: fr,
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      {(batch.statut === "PENDING" || batch.statut === "PROCESSING") && (
        <ImportProgress batchId={id} />
      )}

      {batch.erreur && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6 text-sm text-destructive">
            {batch.erreur}
          </CardContent>
        </Card>
      )}

      {rows && rows.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold">Détail des lignes</h2>
          <div className="rounded-xl border">
            <ImportTable rows={rows} />
          </div>
        </div>
      )}
    </div>
  );
}
