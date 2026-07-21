"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getEbaySetupOptions,
  saveEbaySettings,
  type EbaySetupOptions,
} from "@/features/ebay/actions";
import type { UserSettingsRow } from "@/types/database";

type EbaySettingsProps = {
  settings: UserSettingsRow | null;
  hasConnectedAccount?: boolean;
};

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function EbaySettings({
  settings,
  hasConnectedAccount = false,
}: EbaySettingsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [options, setOptions] = useState<EbaySetupOptions>({
    fulfillment: [],
    payment: [],
    returns: [],
    locations: [],
  });

  const { register, handleSubmit, watch } = useForm({
    defaultValues: {
      marche_ebay: settings?.marche_ebay ?? "EBAY_FR",
      politique_expedition_par_defaut:
        settings?.politique_expedition_par_defaut ?? "",
      politique_retour_par_defaut: settings?.politique_retour_par_defaut ?? "",
      politique_paiement_par_defaut:
        settings?.politique_paiement_par_defaut ?? "",
      lieu_expedition_par_defaut: settings?.lieu_expedition_par_defaut ?? "",
    },
  });

  const selected = {
    fulfillment: watch("politique_expedition_par_defaut"),
    payment: watch("politique_paiement_par_defaut"),
    returns: watch("politique_retour_par_defaut"),
    location: watch("lieu_expedition_par_defaut"),
  };

  useEffect(() => {
    if (!hasConnectedAccount) return;
    let cancelled = false;
    void (async () => {
      const result = await getEbaySetupOptions();
      if (cancelled) return;
      if (result.data) setOptions(result.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [hasConnectedAccount]);

  function withSelectedOption(
    list: Array<{ id: string; name: string }>,
    selectedId: string,
    fallbackName: string,
  ) {
    if (!selectedId) return list;
    if (list.some((item) => item.id === selectedId)) return list;
    return [{ id: selectedId, name: fallbackName }, ...list];
  }

  const fulfillmentOptions = withSelectedOption(
    options.fulfillment,
    selected.fulfillment,
    "Politique enregistrée",
  );
  const paymentOptions = withSelectedOption(
    options.payment,
    selected.payment,
    "Politique enregistrée",
  );
  const returnOptions = withSelectedOption(
    options.returns,
    selected.returns,
    "Politique enregistrée",
  );
  const locationOptions = withSelectedOption(
    options.locations,
    selected.location,
    "Lieu enregistré",
  );

  async function onSubmit(data: Record<string, string>) {
    setIsLoading(true);
    try {
      const result = await saveEbaySettings({
        marche_ebay: data.marche_ebay,
        politique_expedition_par_defaut:
          data.politique_expedition_par_defaut || null,
        politique_retour_par_defaut: data.politique_retour_par_defaut || null,
        politique_paiement_par_defaut:
          data.politique_paiement_par_defaut || null,
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
          Remplies automatiquement à la connexion / publication. Sur un vrai
          compte eBay, vos politiques Seller Hub sont réutilisées.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <fieldset disabled={isLoading} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="marche_ebay">Marché eBay</Label>
              <select
                id="marche_ebay"
                className={selectClassName}
                {...register("marche_ebay")}
              >
                <option value="EBAY_FR">eBay France</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="politique_expedition_par_defaut">
                Politique d&apos;expédition
              </Label>
              <select
                id="politique_expedition_par_defaut"
                className={selectClassName}
                {...register("politique_expedition_par_defaut")}
              >
                <option value="">Sélectionner…</option>
                {fulfillmentOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="politique_retour_par_defaut">
                Politique de retour
              </Label>
              <select
                id="politique_retour_par_defaut"
                className={selectClassName}
                {...register("politique_retour_par_defaut")}
              >
                <option value="">Sélectionner…</option>
                {returnOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="politique_paiement_par_defaut">
                Politique de paiement
              </Label>
              <select
                id="politique_paiement_par_defaut"
                className={selectClassName}
                {...register("politique_paiement_par_defaut")}
              >
                <option value="">Sélectionner…</option>
                {paymentOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lieu_expedition_par_defaut">
                Lieu d&apos;inventaire
              </Label>
              <select
                id="lieu_expedition_par_defaut"
                className={selectClassName}
                {...register("lieu_expedition_par_defaut")}
              >
                <option value="">Sélectionner…</option>
                {locationOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
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
