"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { ProductImportRowsRow } from "@/types/database";

type ImportTableProps = {
  rows: ProductImportRowsRow[];
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  SUCCESS: "default",
  FAILED: "destructive",
  SKIPPED: "outline",
};

export function ImportTable({ rows }: ImportTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Ligne</TableHead>
          <TableHead>Titre</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Erreur</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const data = row.donnees_brutes as Record<string, string>;
          return (
            <TableRow key={row.id}>
              <TableCell>{row.numero_ligne}</TableCell>
              <TableCell>{data.titre ?? "—"}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[row.statut] ?? "outline"}>
                  {row.statut}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-destructive">
                {row.erreur ?? "—"}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
