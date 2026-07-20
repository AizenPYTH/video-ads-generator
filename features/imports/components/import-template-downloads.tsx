"use client";

import { Download, FileSpreadsheet, FileText, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { REQUIRED_COLUMN_LABELS } from "@/features/imports/columns";

const TEMPLATES = [
  {
    href: "/templates/modele-import-ebay.csv",
    label: "Modèle CSV vierge",
    icon: FileText,
  },
  {
    href: "/templates/modele-import-ebay.xlsx",
    label: "Modèle Excel vierge",
    icon: FileSpreadsheet,
  },
  {
    href: "/templates/exemple-import-ebay.csv",
    label: "Exemple CSV 20 produits",
    icon: FileText,
  },
  {
    href: "/templates/exemple-import-ebay.xlsx",
    label: "Exemple Excel 20 produits",
    icon: FileSpreadsheet,
  },
] as const;

export function ImportTemplateDownloads() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Télécharger un modèle
        </CardTitle>
        <CardDescription>
          Utilisez un modèle prêt pour eBay France. Smart Seller peut détecter
          automatiquement la catégorie si vous ne la renseignez pas. Aucune
          publication n&apos;est lancée automatiquement.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/40 p-3">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium">
            <ListChecks className="h-4 w-4" />
            Colonnes obligatoires
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {REQUIRED_COLUMN_LABELS.map((col) => (
              <li key={col.key}>{col.label}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            La catégorie eBay est facultative dans le fichier.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {TEMPLATES.map((tpl) => (
            <Button key={tpl.href} variant="outline" asChild className="justify-start">
              <a href={tpl.href} download>
                <tpl.icon className="mr-2 h-4 w-4" />
                {tpl.label}
              </a>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
