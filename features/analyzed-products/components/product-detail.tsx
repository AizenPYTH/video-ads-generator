"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createAdFromProduct, rerunAnalysis } from "@/features/analyzed-products/actions";
import type { AnalyzedProductsRow } from "@/types/database";
import type { IdentificationResult } from "@/types/identification";
import { toast } from "sonner";
import { useState } from "react";

type ProductDetailProps = {
  product: AnalyzedProductsRow;
};

const DEBUG_MODE = process.env.NEXT_PUBLIC_DEBUG_MODE === "true";

export function ProductDetail({ product }: ProductDetailProps) {
  const [isLoading, setIsLoading] = useState(false);
  const result = product.resultat_identification as IdentificationResult;

  async function handleRerun() {
    setIsLoading(true);
    const res = await rerunAnalysis(product.id);
    if (res.error) toast.error(res.error);
    else toast.success("Analyse relancée.");
    setIsLoading(false);
  }

  async function handleCreateAd() {
    setIsLoading(true);
    const res = await createAdFromProduct(product.id);
    if (res.error) toast.error(res.error);
    else toast.success("Annonce créée.");
    setIsLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {result.soldItem?.name ?? result.brand ?? "Produit analysé"}
          </h2>
          <p className="text-sm text-muted-foreground">{product.url_source}</p>
        </div>
        <div className="flex gap-2">
          {product.necessite_revision && (
            <Badge variant="secondary">À vérifier</Badge>
          )}
          {product.confiance_globale && (
            <Badge>
              Confiance {(parseFloat(product.confiance_globale) * 100).toFixed(0)}%
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Identification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {result.brand && <p><strong>Marque :</strong> {result.brand}</p>}
            {result.model && <p><strong>Modèle :</strong> {result.model}</p>}
            {result.partNumber && <p><strong>Référence :</strong> {result.partNumber}</p>}
            {result.category && <p><strong>Catégorie :</strong> {result.category}</p>}
            {result.condition && <p><strong>État :</strong> {result.condition}</p>}
          </CardContent>
        </Card>

        {result.warnings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Avertissements</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1 pl-4 text-sm text-amber-600">
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex gap-2">
        <Button onClick={handleRerun} disabled={isLoading} variant="outline">
          Relancer l&apos;analyse
        </Button>
        {!product.ad_id && (
          <Button onClick={handleCreateAd} disabled={isLoading}>
            Créer une annonce
          </Button>
        )}
      </div>

      {DEBUG_MODE && (
        <>
          <Separator />
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                Debug (DEBUG_MODE)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="max-h-96 overflow-auto rounded bg-muted p-4 text-xs">
                {JSON.stringify(result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
