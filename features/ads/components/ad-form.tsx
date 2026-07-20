"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateAd } from "@/features/ads/actions";
import type { AdsRow } from "@/types/database";

const adFormSchema = z.object({
  titre: z.string().max(80, "80 caractères maximum").optional(),
  description: z.string().optional(),
  prix_achat: z.string().optional(),
  prix_vente: z.string().optional(),
  quantite: z.number().int().min(1, "Minimum 1"),
  sku: z.string().optional(),
  ebay_category_id: z.string().optional(),
  ebay_condition_id: z.string().optional(),
  notes: z.string().optional(),
});

type AdFormValues = z.infer<typeof adFormSchema>;

type AdFormProps = {
  ad: AdsRow;
  onSuccess?: () => void;
};

export function AdForm({ ad, onSuccess }: AdFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdFormValues>({
    resolver: zodResolver(adFormSchema),
    defaultValues: {
      titre: ad.titre ?? "",
      description: ad.description ?? "",
      prix_achat: ad.prix_achat ?? "",
      prix_vente: ad.prix_vente ?? "",
      quantite: ad.quantite,
      sku: ad.sku ?? "",
      ebay_category_id: ad.ebay_category_id ?? "",
      ebay_condition_id: ad.ebay_condition_id ?? "",
      notes: ad.notes ?? "",
    },
  });

  async function onSubmit(data: AdFormValues) {
    setIsLoading(true);
    const result = await updateAd(ad.id, {
      titre: data.titre || null,
      description: data.description || null,
      prix_achat: data.prix_achat || null,
      prix_vente: data.prix_vente || null,
      quantite: data.quantite,
      sku: data.sku || null,
      ebay_category_id: data.ebay_category_id || null,
      ebay_condition_id: data.ebay_condition_id || null,
      notes: data.notes || null,
    });

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Annonce mise à jour.");
      onSuccess?.();
    }
    setIsLoading(false);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="titre">Titre</Label>
        <Input id="titre" {...register("titre")} />
        {errors.titre && (
          <p className="text-sm text-destructive">{errors.titre.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" rows={6} {...register("description")} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="prix_achat">Prix d&apos;achat (€)</Label>
          <Input id="prix_achat" type="number" step="0.01" {...register("prix_achat")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="prix_vente">Prix de vente (€)</Label>
          <Input id="prix_vente" type="number" step="0.01" {...register("prix_vente")} />
          {errors.prix_vente && (
            <p className="text-sm text-destructive">{errors.prix_vente.message}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="quantite">Quantité</Label>
          <Input
            id="quantite"
            type="number"
            {...register("quantite", { valueAsNumber: true })}
          />
          {errors.quantite && (
            <p className="text-sm text-destructive">{errors.quantite.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="sku">SKU</Label>
          <Input id="sku" {...register("sku")} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ebay_category_id">Catégorie eBay</Label>
          <Input id="ebay_category_id" {...register("ebay_category_id")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ebay_condition_id">État eBay</Label>
          <Input id="ebay_condition_id" {...register("ebay_condition_id")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes internes</Label>
        <Textarea id="notes" rows={3} {...register("notes")} />
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </form>
  );
}
