"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
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
    try {
      const result = await updateNotifications(values);
      if (result.error) toast.error(result.error);
      else toast.success("Préférences de notification enregistrées.");
    } finally {
      setIsLoading(false);
    }
  }

  const toggles = [
    {
      key: "email_nouvelle_annonce" as const,
      label: "Nouvelle annonce créée",
      description: "Quand une annonce est prête dans Smart Seller.",
    },
    {
      key: "email_publication_reussie" as const,
      label: "Publication réussie",
      description: "Quand une annonce est publiée sur eBay.",
    },
    {
      key: "email_publication_echouee" as const,
      label: "Publication échouée",
      description: "Quand une publication nécessite votre attention.",
    },
    {
      key: "email_analyse_terminee" as const,
      label: "Analyse terminée",
      description: "Quand l’identification d’un produit est terminée.",
    },
    {
      key: "email_quota_atteint" as const,
      label: "Limite atteinte",
      description: "Quand une limite mensuelle est atteinte.",
    },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {toggles.map(({ key, label, description }) => (
        <div
          key={key}
          className="flex items-center justify-between gap-4 rounded-lg border p-4"
        >
          <div className="space-y-1">
            <Label htmlFor={key}>{label}</Label>
            <p id={`${key}-description`} className="text-sm text-muted-foreground">
              {description}
            </p>
          </div>
          <Switch
            id={key}
            checked={values[key]}
            disabled={isLoading}
            aria-describedby={`${key}-description`}
            onCheckedChange={(checked) =>
              setValues((prev) => ({ ...prev, [key]: checked }))
            }
          />
        </div>
      ))}
      <Button type="submit" disabled={isLoading}>
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Save className="mr-2 h-4 w-4" aria-hidden="true" />
        )}
        {isLoading ? "Enregistrement…" : "Enregistrer les notifications"}
      </Button>
    </form>
  );
}
