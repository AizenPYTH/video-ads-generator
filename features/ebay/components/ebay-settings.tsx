"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { saveEbaySettings } from "@/features/ebay/actions";
import type { UserSettingsRow } from "@/types/database";

type EbaySettingsProps = {
  settings: UserSettingsRow | null;
};

export function EbaySettings({ settings }: EbaySettingsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit } = useForm({
    defaultValues: {
      marche_ebay: settings?.marche_ebay ?? "EBAY_FR",
      politique_expedition_par_defaut: settings?.politique_expedition_par_defaut ?? "",
      politique_retour_par_defaut: settings?.politique_retour_par_defaut ?? "",
      politique_paiement_par_defaut: settings?.politique_paiement_par_defaut ?? "",
      lieu_expedition_par_defaut: settings?.lieu_expedition_par_defaut ?? "",
    },
  });

  async function onSubmit(data: Record<string, string>) {
    setIsLoading(true);
    try {
      const result = await saveEbaySettings({
        marche_ebay: data.marche_ebay,
        politique_expedition_par_defaut: data.politique_expedition_par_defaut || null,
        politique_retour_par_defaut: data.politique_retour_par_defaut || null,
        politique_paiement_par_defaut: data.politique_paiement_par_defaut || null,
        lieu_expedition_par_defaut: data.lieu_expedition_par_defaut || null,
      });

      if (result.error) toast.error(result.error);
      else toast.success("Préférences eBay enregistrées.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Préférences de publication</CardTitle>
        <CardDescription>
          Définissez les politiques utilisées par défaut pour vos nouvelles annonces.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <fieldset disabled={isLoading} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="marche_ebay">Marché eBay</Label>
              <select
                id="marche_ebay"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...register("marche_ebay")}
              >
                <option value="EBAY_FR">eBay France</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="politique_expedition_par_defaut">
                Politique d&apos;expédition
              </Label>
              <Input
                id="politique_expedition_par_defaut"
                placeholder="Nom ou identifiant de la politique"
                {...register("politique_expedition_par_defaut")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="politique_retour_par_defaut">Politique de retour</Label>
              <Input
                id="politique_retour_par_defaut"
                placeholder="Nom ou identifiant de la politique"
                {...register("politique_retour_par_defaut")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="politique_paiement_par_defaut">Politique de paiement</Label>
              <Input
                id="politique_paiement_par_defaut"
                placeholder="Nom ou identifiant de la politique"
                {...register("politique_paiement_par_defaut")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lieu_expedition_par_defaut">Lieu d&apos;expédition</Label>
              <Input
                id="lieu_expedition_par_defaut"
                placeholder="Ville ou code postal"
                {...register("lieu_expedition_par_defaut")}
              />
            </div>
          </fieldset>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            {isLoading ? "Enregistrement…" : "Enregistrer les préférences"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
