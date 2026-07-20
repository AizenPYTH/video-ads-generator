"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { importProductFromUrl } from "@/features/url-import/actions";

const urlImportSchema = z.object({
  url: z.string().url("URL invalide").min(1, "L'URL est requise"),
});

type UrlImportFormValues = z.infer<typeof urlImportSchema>;

export function UrlImportForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UrlImportFormValues>({
    resolver: zodResolver(urlImportSchema),
  });

  async function onSubmit(data: UrlImportFormValues) {
    setIsLoading(true);
    const result = await importProductFromUrl(data.url);

    if (result.error) {
      toast.error(result.error);
    } else if (result.data) {
      toast.success("Produit importé avec succès.");
      router.push(`/dashboard/annonces/${result.data.adId}`);
    }
    setIsLoading(false);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="url">URL du produit</Label>
        <Input
          id="url"
          type="url"
          placeholder="https://www.ebay.fr/itm/..."
          {...register("url")}
        />
        {errors.url && (
          <p className="text-sm text-destructive">{errors.url.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Import en cours..." : "Importer"}
      </Button>
    </form>
  );
}
