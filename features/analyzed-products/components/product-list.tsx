"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { AnalyzedProductsRow } from "@/types/database";
import type { IdentificationResult } from "@/types/identification";

type ProductListProps = {
  products: AnalyzedProductsRow[];
};

export function ProductList({ products }: ProductListProps) {
  function getConfidenceLabel(value: string | null) {
    if (!value) return { label: "Non évaluée", value: null };

    const percent = Math.round(parseFloat(value) * 100);
    if (percent >= 80) return { label: "Élevée", value: percent };
    if (percent >= 50) return { label: "Moyenne", value: percent };
    return { label: "Faible", value: percent };
  }

  return (
    <>
      <div className="divide-y md:hidden">
        {products.map((product) => {
          const result = product.resultat_identification as IdentificationResult;
          const label =
            result.soldItem?.name ?? result.brand ?? "Produit analysé";
          const confidence = getConfidenceLabel(product.confiance_globale);

          return (
            <article key={product.id} className="space-y-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate font-medium">{label}</h2>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {product.url_source}
                  </p>
                </div>
                <Badge variant={product.necessite_revision ? "secondary" : "glacier"}>
                  {product.necessite_revision ? "À vérifier" : "Identifié"}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Confiance : {confidence.label}
                  {confidence.value !== null ? ` (${confidence.value} %)` : ""}
                </span>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/dashboard/produits/${product.id}`}>
                    Détails
                    <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
              {product.ad_id && (
                <Link
                  href={`/dashboard/annonces/${product.ad_id}`}
                  className="inline-flex text-sm font-medium text-primary hover:underline"
                >
                  Voir l&apos;annonce associée
                </Link>
              )}
            </article>
          );
        })}
      </div>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produit</TableHead>
              <TableHead>Confiance</TableHead>
              <TableHead>État</TableHead>
              <TableHead>Annonce</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const result = product.resultat_identification as IdentificationResult;
              const label =
                result.soldItem?.name ?? result.brand ?? "Produit analysé";
              const confidence = getConfidenceLabel(product.confiance_globale);

              return (
                <TableRow key={product.id}>
                  <TableCell className="max-w-xs">
                    <p className="truncate font-medium">{label}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {product.url_source}
                    </p>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{confidence.label}</span>
                    {confidence.value !== null && (
                      <span className="ml-1 text-muted-foreground">
                        ({confidence.value} %)
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.necessite_revision ? "secondary" : "glacier"}>
                      {product.necessite_revision ? "À vérifier" : "Identifié"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {product.ad_id ? (
                      <Link
                        href={`/dashboard/annonces/${product.ad_id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        Voir l&apos;annonce
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Non créée</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/produits/${product.id}`}>
                        Détails
                        <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
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
