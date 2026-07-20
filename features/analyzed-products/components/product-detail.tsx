"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/layout/page-header";
import { createAdFromProduct, rerunAnalysis } from "@/features/analyzed-products/actions";
import type { AnalyzedProductsRow } from "@/types/database";
import type { IdentificationResult } from "@/types/identification";
import { toast } from "sonner";
import { useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";

type ProductDetailProps = {
  product: AnalyzedProductsRow;
};

const DEBUG_MODE = process.env.NEXT_PUBLIC_DEBUG_MODE === "true";

export function ProductDetail({ product }: ProductDetailProps) {
  const [activeAction, setActiveAction] = useState<"rerun" | "create" | null>(
    null,
  );
  const isLoading = activeAction !== null;
  const result = product.resultat_identification as IdentificationResult;
  const confidence = product.confiance_globale
    ? Math.round(parseFloat(product.confiance_globale) * 100)
    : null;
  const confidenceLabel =
    confidence === null
      ? "Non évaluée"
      : confidence >= 80
        ? "Élevée"
        : confidence >= 50
          ? "Moyenne"
          : "Faible";

  async function handleRerun() {
    setActiveAction("rerun");
    try {
      const res = await rerunAnalysis(product.id);
      if (res.error) toast.error(res.error);
      else toast.success("Analyse en cours");
    } finally {
      setActiveAction(null);
    }
  }

  async function handleCreateAd() {
    setActiveAction("create");
    try {
      const res = await createAdFromProduct(product.id);
      if (res.error) toast.error(res.error);
      else toast.success("Annonce créée.");
    } finally {
      setActiveAction(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={result.soldItem?.name ?? result.brand ?? "Produit analysé"}
        description="Consultez les informations reconnues avant de créer votre annonce."
      >
        <Badge variant={product.necessite_revision ? "secondary" : "glacier"}>
          {product.necessite_revision ? "Révision recommandée" : "Identification terminée"}
        </Badge>
        <Badge variant="outline">
          Confiance {confidenceLabel}
          {confidence !== null ? ` · ${confidence} %` : ""}
        </Badge>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Identification</CardTitle>
            <CardDescription>
              Informations détectées à partir des photos fournies.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
              <dt className="text-muted-foreground">Marque</dt>
              <dd className="text-right font-medium">{result.brand ?? "Non reconnue"}</dd>
              <dt className="text-muted-foreground">Modèle</dt>
              <dd className="text-right font-medium">{result.model ?? "Non reconnu"}</dd>
              <dt className="text-muted-foreground">Référence</dt>
              <dd className="text-right font-medium">{result.partNumber ?? "Non reconnue"}</dd>
              <dt className="text-muted-foreground">Catégorie</dt>
              <dd className="text-right font-medium">{result.category ?? "Non reconnue"}</dd>
              <dt className="text-muted-foreground">État</dt>
              <dd className="text-right font-medium">{result.condition ?? "Non reconnu"}</dd>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Points à contrôler</CardTitle>
            <CardDescription>
              {result.warnings.length > 0
                ? "Vérifiez ces éléments avant de poursuivre."
                : "Aucune vérification particulière n’est nécessaire."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result.warnings.length > 0 ? (
              <ul className="list-disc space-y-1 pl-4 text-sm text-amber-600">
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Les informations principales ont été reconnues.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button onClick={handleRerun} disabled={isLoading} variant="outline">
          {activeAction === "rerun" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
          )}
          Relancer l&apos;analyse
        </Button>
        {!product.ad_id && (
          <Button onClick={handleCreateAd} disabled={isLoading}>
            {activeAction === "create" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            {activeAction === "create" ? "Création…" : "Créer une annonce"}
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
