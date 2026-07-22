"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { importProductFromUrl } from "@/features/url-import/actions";
import { classifyImportUrl } from "@/lib/scraping/url-kind";

const urlImportSchema = z.object({
  url: z.string().url("URL invalide").min(1, "L'URL est requise"),
});

type UrlImportFormValues = z.infer<typeof urlImportSchema>;

export function UrlImportForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UrlImportFormValues>({
    resolver: zodResolver(urlImportSchema),
  });

  const classification = useMemo(() => {
    if (!previewUrl || previewUrl.length < 12) return null;
    try {
      return classifyImportUrl(previewUrl);
    } catch {
      return null;
    }
  }, [previewUrl]);

  async function onSubmit(data: UrlImportFormValues) {
    setIsLoading(true);
    const kind = classifyImportUrl(data.url).kind;
    const result = await importProductFromUrl(data.url);

    if (result.error) {
      toast.error(result.error);
      setIsLoading(false);
      return;
    }

    if (result.data?.mode === "catalog") {
      const ok = result.data.importedCount ?? 0;
      const fail = result.data.failedCount ?? 0;
      toast.success(
        `${ok} produit${ok > 1 ? "s" : ""} importé${ok > 1 ? "s" : ""}${
          fail ? ` · ${fail} échec${fail > 1 ? "s" : ""}` : ""
        }.`,
      );
      router.push("/dashboard/annonces");
    } else if (result.data?.adId) {
      toast.success(
        kind === "product"
          ? "Produit importé avec ses caractéristiques."
          : "Produit importé avec succès.",
      );
      router.push(`/dashboard/annonces/${result.data.adId}`);
    }
    setIsLoading(false);
  }

  const { onChange: registerOnChange, ...urlRegister } = register("url");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="url">Lien produit ou boutique</Label>
        <Input
          id="url"
          type="url"
          placeholder="https://www.ebay.fr/itm/… ou une catégorie Utopya"
          {...urlRegister}
          onChange={(e) => {
            registerOnChange(e);
            setPreviewUrl(e.target.value);
          }}
        />
        {errors.url && (
          <p className="text-sm text-destructive">{errors.url.message}</p>
        )}
        {classification ? (
          <p className="text-sm text-[var(--ss-text-muted)]">
            {classification.kind === "catalog" ? (
              <>
                Boutique / catégorie détectée — Smart Seller importera jusqu’à
                25 produits listés sur la page.
              </>
            ) : classification.kind === "product" ? (
              <>
                Fiche produit détectée — titre, images, prix et caractéristiques
                (Type, Marque…) seront récupérés.
              </>
            ) : (
              <>{classification.reason}</>
            )}
          </p>
        ) : null}
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading
          ? classification?.kind === "catalog"
            ? "Import de la boutique…"
            : "Import en cours…"
          : classification?.kind === "catalog"
            ? "Importer les produits"
            : "Importer"}
      </Button>
    </form>
  );
}
