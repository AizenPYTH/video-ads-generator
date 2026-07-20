"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { updatePreferences } from "@/features/settings/actions";
import type { UserSettingsRow } from "@/types/database";

type PreferencesFormProps = {
  settings: UserSettingsRow | null;
};

export function PreferencesForm({ settings }: PreferencesFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit } = useForm({
    defaultValues: {
      devise: settings?.devise ?? "EUR",
      marche_ebay: settings?.marche_ebay ?? "EBAY_FR",
    },
  });

  async function onSubmit(data: Record<string, string>) {
    setIsLoading(true);
    try {
      const result = await updatePreferences(data);
      if (result.error) toast.error(result.error);
      else toast.success("Préférences enregistrées.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <fieldset disabled={isLoading} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="devise">Devise</Label>
          <select
            id="devise"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("devise")}
          >
            <option value="EUR">Euro (€)</option>
          </select>
        </div>
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
  );
}
