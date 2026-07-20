"use client";

import Link from "next/link";
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
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Produit</TableHead>
          <TableHead>Confiance</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Annonce</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => {
          const result = product.resultat_identification as IdentificationResult;
          const label =
            result.soldItem?.name ??
            result.brand ??
            product.url_source.slice(0, 40);

          return (
            <TableRow key={product.id}>
              <TableCell className="font-medium">{label}</TableCell>
              <TableCell>
                {product.confiance_globale
                  ? `${(parseFloat(product.confiance_globale) * 100).toFixed(0)}%`
                  : "—"}
              </TableCell>
              <TableCell>
                {product.necessite_revision ? (
                  <Badge variant="secondary">À vérifier</Badge>
                ) : (
                  <Badge>Identifié</Badge>
                )}
              </TableCell>
              <TableCell>
                {product.ad_id ? (
                  <Link href={`/dashboard/annonces/${product.ad_id}`} className="text-primary hover:underline">
                    Voir
                  </Link>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/dashboard/produits/${product.id}`}>Détails</Link>
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
