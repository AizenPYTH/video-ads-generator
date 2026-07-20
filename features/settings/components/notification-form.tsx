"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateNotifications } from "@/features/settings/actions";
import type { NotificationSettingsRow } from "@/types/database";

type NotificationFormProps = {
  settings: NotificationSettingsRow | null;
};

export function NotificationForm({ settings }: NotificationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [values, setValues] = useState({
    email_nouvelle_annonce: settings?.email_nouvelle_annonce ?? true,
    email_publication_reussie: settings?.email_publication_reussie ?? true,
    email_publication_echouee: settings?.email_publication_echouee ?? true,
    email_analyse_terminee: settings?.email_analyse_terminee ?? true,
    email_quota_atteint: settings?.email_quota_atteint ?? true,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    const result = await updateNotifications(values);
    if (result.error) toast.error(result.error);
    else toast.success("Notifications mises à jour.");
    setIsLoading(false);
  }

  const toggles = [
    { key: "email_nouvelle_annonce" as const, label: "Nouvelle annonce créée" },
    { key: "email_publication_reussie" as const, label: "Publication réussie" },
    { key: "email_publication_echouee" as const, label: "Publication échouée" },
    { key: "email_analyse_terminee" as const, label: "Analyse terminée" },
    { key: "email_quota_atteint" as const, label: "Quota atteint" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {toggles.map(({ key, label }) => (
        <div key={key} className="flex items-center justify-between">
          <Label htmlFor={key}>{label}</Label>
          <Switch
            id={key}
            checked={values[key]}
            onCheckedChange={(checked) =>
              setValues((prev) => ({ ...prev, [key]: checked }))
            }
          />
        </div>
      ))}
      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </form>
  );
}
