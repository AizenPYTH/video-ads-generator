import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { fetchAdById } from "@/features/ads/queries";
import { validateAdForPublish } from "@/features/ads/validation";
import { getStatusLabel } from "@/features/ads/status";
import { PublishDialog } from "@/features/ads/components/publish-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { IdentificationResult } from "@/types/identification";
import type { Ad } from "@/types/ads";

export const metadata = {
  title: "Détail annonce — SNOWOLF",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AnnonceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const ad = await fetchAdById(user.id, id);
  if (!ad) notFound();

  const validation = validateAdForPublish({
    id: ad.id,
    user_id: ad.user_id,
    titre: ad.titre,
    description: ad.description,
    statut: ad.statut,
    resultat_identification: ad.resultat_identification as IdentificationResult | null,
    prix_achat: ad.prix_achat,
    prix_vente: ad.prix_vente,
    quantite: ad.quantite,
    sku: ad.sku,
    ebay_category_id: ad.ebay_category_id,
    ebay_condition_id: ad.ebay_condition_id,
    notes: ad.notes,
  } satisfies Ad);

  const identification = ad.resultat_identification as IdentificationResult | null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/annonces">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Mes annonces
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/annonces/${id}/modifier`}>
              <Pencil className="mr-2 h-4 w-4" />
              Modifier
            </Link>
          </Button>
          <PublishDialog
            adId={id}
            adTitle={ad.titre}
            validation={validation}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-navy-900">
            {ad.titre ?? "Sans titre"}
          </h1>
          <Badge variant="secondary">{getStatusLabel(ad.statut)}</Badge>
        </div>
        {ad.prix_vente && (
          <p className="mt-2 text-2xl font-semibold text-navy-900">
            {ad.prix_vente} €
          </p>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Quantité :</strong> {ad.quantite}</p>
            {ad.sku && <p><strong>Référence :</strong> {ad.sku}</p>}
            {ad.prix_achat && (
              <p><strong>Prix d&apos;achat :</strong> {ad.prix_achat} €</p>
            )}
          </CardContent>
        </Card>

        {identification && (
          <Card>
            <CardHeader>
              <CardTitle>Identification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {identification.brand && (
                <p><strong>Marque :</strong> {identification.brand}</p>
              )}
              {identification.model && (
                <p><strong>Modèle :</strong> {identification.model}</p>
              )}
              {identification.partNumber && (
                <p><strong>Référence :</strong> {identification.partNumber}</p>
              )}
              {identification.condition && (
                <p><strong>État :</strong> {identification.condition}</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {ad.description && (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{ad.description}</p>
          </CardContent>
        </Card>
      )}

      {!validation.valid && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-800">
              Éléments à compléter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-4 text-sm text-amber-700">
              {validation.errors.map((e) => (
                <li key={e.field}>{e.message}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {ad.notes && (
        <>
          <Separator />
          <p className="text-sm text-muted-foreground">
            <strong>Notes :</strong> {ad.notes}
          </p>
        </>
      )}
    </div>
  );
}
