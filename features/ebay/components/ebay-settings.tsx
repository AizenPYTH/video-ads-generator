"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    const result = await saveEbaySettings({
      marche_ebay: data.marche_ebay,
      politique_expedition_par_defaut: data.politique_expedition_par_defaut || null,
      politique_retour_par_defaut: data.politique_retour_par_defaut || null,
      politique_paiement_par_defaut: data.politique_paiement_par_defaut || null,
      lieu_expedition_par_defaut: data.lieu_expedition_par_defaut || null,
    });

    if (result.error) toast.error(result.error);
    else toast.success("Paramètres eBay sauvegardés.");
    setIsLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paramètres eBay</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="marche_ebay">Marché</Label>
            <Input id="marche_ebay" {...register("marche_ebay")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="politique_expedition_par_defaut">Politique d&apos;expédition</Label>
            <Input id="politique_expedition_par_defaut" {...register("politique_expedition_par_defaut")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="politique_retour_par_defaut">Politique de retour</Label>
            <Input id="politique_retour_par_defaut" {...register("politique_retour_par_defaut")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="politique_paiement_par_defaut">Politique de paiement</Label>
            <Input id="politique_paiement_par_defaut" {...register("politique_paiement_par_defaut")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lieu_expedition_par_defaut">Lieu d&apos;expédition</Label>
            <Input id="lieu_expedition_par_defaut" {...register("lieu_expedition_par_defaut")} />
          </div>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
