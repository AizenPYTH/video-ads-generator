"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { importProductFromUrl } from "@/features/url-import/actions";
import { classifyImportUrl } from "@/lib/scraping/url-kind";
import { coerceImportUrl } from "@/lib/scraping/coerce-url";
import { UTOPYA_COOKIES_HELP } from "@/lib/scraping/utopya-cookies";

const STORAGE_KEY = "snowolf.utopya_cookies";

const urlImportSchema = z.object({
  url: z
    .string()
    .min(1, "L'URL est requise")
    .refine((value) => {
      try {
        const coerced = coerceImportUrl(value);
        // eslint-disable-next-line no-new
        new URL(coerced);
        return /^https?:\/\//i.test(coerced);
      } catch {
        return false;
      }
    }, "URL invalide — collez un lien amazon.fr, ebay.fr ou utopya.fr"),
  utopyaCookies: z.string().optional(),
});

type UrlImportFormValues = z.infer<typeof urlImportSchema>;

export function UrlImportForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UrlImportFormValues>({
    resolver: zodResolver(urlImportSchema),
    defaultValues: { url: "", utopyaCookies: "" },
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setValue("utopyaCookies", saved);
    } catch {
      /* ignore */
    }
  }, [setValue]);

  const cookiesValue = watch("utopyaCookies") ?? "";
  const isUtopya = /utopya\.fr/i.test(previewUrl);

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
    const url = coerceImportUrl(data.url);
    const kind = classifyImportUrl(url).kind;
    const cookies = data.utopyaCookies?.trim() || null;

    if (cookies) {
      try {
        localStorage.setItem(STORAGE_KEY, cookies);
      } catch {
        /* ignore */
      }
    }

    if (/utopya\.fr/i.test(url) && !cookies) {
      toast.message(
        "Import sans cookies : titres, images et caractéristiques OK. Prix à saisir manuellement (ou ajoutez les cookies pour les prix auto).",
        { duration: 7000 },
      );
    }

    const result = await importProductFromUrl(url, cookies);

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
      const ids = (result.data.adIds ?? []).filter(Boolean);
      if (ids.length > 0) {
        router.push(
          `/dashboard/annonces?ids=${encodeURIComponent(ids.join(","))}`,
        );
        router.refresh();
      } else {
        router.push("/dashboard/annonces");
        router.refresh();
      }
    } else if (result.data?.adId) {
      toast.success(
        kind === "product"
          ? "Produit importé avec ses caractéristiques."
          : "Produit importé avec succès.",
      );
      router.push(`/dashboard/annonces/${result.data.adId}`);
      router.refresh();
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
          type="text"
          inputMode="url"
          autoComplete="url"
          placeholder="amazon.fr/dp/… ou https://www.ebay.fr/itm/…"
          {...urlRegister}
          onChange={(e) => {
            registerOnChange(e);
            setPreviewUrl(coerceImportUrl(e.target.value));
          }}
        />
        {errors.url && (
          <p className="text-sm text-destructive">{errors.url.message}</p>
        )}
        {classification ? (
          <p className="text-sm text-[var(--ss-text-muted)]">
            {classification.kind === "catalog" ? (
              <>
                Boutique / catégorie détectée — jusqu’à 60 produits seront
                importés (pagination Magento incluse si besoin).
              </>
            ) : classification.kind === "product" ? (
              <>
                Fiche produit détectée — titre, images, prix et caractéristiques
                seront récupérés.
              </>
            ) : (
              <>{classification.reason}</>
            )}
          </p>
        ) : null}
      </div>

      {(isUtopya || cookiesValue.length > 0) && (
        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900 dark:bg-amber-950/30">
          <Label htmlFor="utopyaCookies">
            Cookies Utopya (optionnel — pour les prix automatiques)
          </Label>
          <Textarea
            id="utopyaCookies"
            rows={3}
            placeholder="PHPSESSID=…; form_key=…; …"
            className="font-mono text-xs"
            {...register("utopyaCookies")}
          />
          <p className="text-xs text-muted-foreground">{UTOPYA_COOKIES_HELP}</p>
          {!cookiesValue.trim() ? (
            <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
              Sans cookies vous pouvez quand même importer (catégorie, images,
              specs). Les prix resteront vides — saisissez-les manuellement sur
              chaque annonce. Pour les prix auto : connectez-vous sur utopya.fr
              puis F12 → Application → Cookies.
            </p>
          ) : (
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              Cookies enregistrés localement — les prix type 179,84€ pourront
              être lus.
            </p>
          )}
        </div>
      )}

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
