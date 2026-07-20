"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateMarketingTemplate } from "@/features/settings/actions";
import type { MarketingTemplatesRow } from "@/types/database";

type MarketingSettingsProps = {
  template: MarketingTemplatesRow | null;
};

export function MarketingSettings({ template }: MarketingSettingsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit } = useForm({
    defaultValues: {
      nom: template?.nom ?? "Template Snowolf",
      type_template: template?.type_template ?? "snowolf",
      contenu: JSON.stringify(template?.contenu ?? { accentColor: "#1e3a5f", showPrice: true }, null, 2),
    },
  });

  async function onSubmit(data: Record<string, string>) {
    setIsLoading(true);

    let contenu: Record<string, unknown>;
    try {
      contenu = JSON.parse(data.contenu);
    } catch {
      toast.error("Le contenu JSON est invalide.");
      setIsLoading(false);
      return;
    }

    const result = await updateMarketingTemplate({
      templateId: template?.id,
      nom: data.nom,
      type_template: data.type_template,
      contenu,
      est_par_defaut: true,
    });

    if (result.error) toast.error(result.error);
    else toast.success("Template marketing sauvegardé.");
    setIsLoading(false);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nom">Nom du template</Label>
        <Input id="nom" {...register("nom")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="type_template">Type</Label>
        <Input id="type_template" {...register("type_template")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contenu">Configuration (JSON)</Label>
        <Textarea id="contenu" rows={8} className="font-mono text-sm" {...register("contenu")} />
      </div>
      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </form>
  );
}
