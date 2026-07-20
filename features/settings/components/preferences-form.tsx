"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    const result = await updatePreferences(data);
    if (result.error) toast.error(result.error);
    else toast.success("Préférences mises à jour.");
    setIsLoading(false);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="devise">Devise</Label>
        <Input id="devise" {...register("devise")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="marche_ebay">Marché eBay</Label>
        <Input id="marche_ebay" {...register("marche_ebay")} />
      </div>
      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </form>
  );
}
