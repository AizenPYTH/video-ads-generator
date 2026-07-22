"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, MapPin, Save } from "lucide-react";
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
import {
  createEbayInventoryLocation,
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
  const [isCreatingLocation, setIsCreatingLocation] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [options, setOptions] = useState<EbaySetupOptions>({
    fulfillment: [],
    payment: [],
    returns: [],
    locations: [],
  });

  const { register, handleSubmit, watch, setValue } = useForm({
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

  const locationForm = useForm({
    defaultValues: {
      name: "Entrepôt principal",
      addressLine1: "",
      city: "",
      postalCode: "",
      country: "FR",
    },
  });

  const selected = {
    fulfillment: watch("politique_expedition_par_defaut"),
    payment: watch("politique_paiement_par_defaut"),
    returns: watch("politique_retour_par_defaut"),
    location: watch("lieu_expedition_par_defaut"),
  };

  async function refreshOptions() {
    const result = await getEbaySetupOptions();
    if (result.error) {
      setOptionsError(result.error);
    } else {
      setOptionsError(null);
    }
    if (result.data) setOptions(result.data);
    return result.data;
  }

  useEffect(() => {
    if (!hasConnectedAccount) return;
    let cancelled = false;
    void (async () => {
      const data = await refreshOptions();
      if (cancelled || !data) return;
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function onCreateLocation(data: {
    name: string;
    addressLine1: string;
    city: string;
    postalCode: string;
    country: string;
  }) {
    setIsCreatingLocation(true);
    try {
      const result = await createEbayInventoryLocation(data);
      if (result.error || !result.data) {
        toast.error(result.error ?? "Impossible de créer le lieu.");
        return;
      }

      toast.success(`Lieu « ${result.data.name} » créé sur eBay.`);
      setValue("lieu_expedition_par_defaut", result.data.key);
      await refreshOptions();
    } finally {
      setIsCreatingLocation(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Préférences de publication</CardTitle>
        <CardDescription>
          Remplies automatiquement à la connexion. Vous pouvez ajuster les
          politiques d’expédition, de retour, de paiement et le lieu
          d’expédition utilisés pour la publication.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {optionsError ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            Impossible de charger les options eBay : {optionsError}
          </p>
        ) : null}

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
                Lieu d&apos;expédition
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
              {locationOptions.length === 0 ? (
                <p className="text-sm text-[var(--ss-text-muted)]">
                  Aucun lieu sur ce compte eBay. Créez-en un ci-dessous (adresse
                  réelle d’expédition).
                </p>
              ) : null}
            </div>
          </fieldset>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <Loader2
                className="mr-2 h-4 w-4 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Save className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            {isLoading ? "Enregistrement…" : "Enregistrer les préférences"}
          </Button>
        </form>

        <div className="space-y-4 border-t border-border/60 pt-6">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 text-[var(--ss-navy-700)]" />
            <div>
              <h3 className="text-sm font-semibold">
                Créer un lieu d&apos;expédition
              </h3>
              <p className="text-sm text-[var(--ss-text-muted)]">
                Obligatoire pour publier. L’adresse doit correspondre à votre
                entrepôt / point d’envoi réel.
              </p>
            </div>
          </div>

          <form
            onSubmit={locationForm.handleSubmit(onCreateLocation)}
            className="grid gap-3 sm:grid-cols-2"
          >
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="loc_name">Nom du lieu</Label>
              <Input
                id="loc_name"
                placeholder="Entrepôt principal"
                {...locationForm.register("name", { required: true })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="loc_address">Adresse</Label>
              <Input
                id="loc_address"
                placeholder="12 rue Example"
                {...locationForm.register("addressLine1", { required: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loc_city">Ville</Label>
              <Input
                id="loc_city"
                placeholder="Paris"
                {...locationForm.register("city", { required: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loc_postal">Code postal</Label>
              <Input
                id="loc_postal"
                placeholder="75001"
                {...locationForm.register("postalCode", { required: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loc_country">Pays</Label>
              <Input
                id="loc_country"
                placeholder="FR"
                {...locationForm.register("country", { required: true })}
              />
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                variant="secondary"
                disabled={isCreatingLocation}
                className="w-full"
              >
                {isCreatingLocation ? (
                  <Loader2
                    className="mr-2 h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <MapPin className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                {isCreatingLocation ? "Création…" : "Créer le lieu sur eBay"}
              </Button>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
