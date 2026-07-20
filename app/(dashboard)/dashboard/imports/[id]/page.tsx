import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertCircle, ArrowLeft, CalendarDays, CheckCircle2, Rows3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ImportTable } from "@/features/imports/components/import-table";
import { ImportProgress } from "@/features/imports/components/import-progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ImportBatchStatut } from "@/types/database";

export const metadata = {
  title: "Détail import — Smart Seller",
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
    <div className="mx-auto max-w-5xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/dashboard/imports">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Imports
        </Link>
      </Button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-primary">Détail de l’import</p>
          <h1 className="mt-1 break-words text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {batch.nom_fichier}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Retrouvez l’avancement et le résultat de chaque ligne.
          </p>
        </div>
        <Badge
          className="w-fit"
          variant={STATUS_VARIANT[batch.statut as ImportBatchStatut]}
        >
          {getStatusLabel(
            batch.statut as ImportBatchStatut,
            batch.lignes_echouees,
          )}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Lignes", value: batch.nombre_lignes, icon: Rows3 },
          {
            label: "Réussies",
            value: batch.lignes_reussies,
            icon: CheckCircle2,
            className: "text-emerald-600",
          },
          {
            label: "Échouées",
            value: batch.lignes_echouees,
            icon: AlertCircle,
            className: "text-destructive",
          },
        ].map((item) => (
          <Card key={item.label} className="shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <item.icon className="h-4 w-4" />
                {item.label}
              </div>
              <p className={`mt-2 text-2xl font-bold ${item.className ?? ""}`}>
                {item.value}
              </p>
            </CardContent>
          </Card>
        ))}
        <Card className="shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              Importé le
            </div>
            <p className="mt-2 text-sm font-semibold">
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
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <AlertCircle className="h-4 w-4" />
              Import interrompu
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-destructive">
            {String(batch.erreur)
              .split(/\r?\n/)
              .filter(Boolean)
              .map((line: string, index: number) => (
                <p key={`${line}-${index}`} className="break-words">
                  {line}
                </p>
              ))}
          </CardContent>
        </Card>
      )}

      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Résultat par ligne</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Deux blocs : annonces fiables (&gt; 90&nbsp;% de confiance) à publier
            en sélection, et lignes à vérifier.
          </p>
        </div>
        {rows && rows.length > 0 ? (
          <ImportTable rows={rows} />
        ) : (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <p className="font-medium">Aucune ligne à afficher</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Les résultats apparaîtront ici dès le début du traitement.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
