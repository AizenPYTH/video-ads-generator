"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AD_STATUS_GROUPS, type AdStatusGroup } from "@/features/ads/status";

const STATUS_GROUPS = Object.keys(AD_STATUS_GROUPS) as AdStatusGroup[];

export function AdFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`/dashboard/annonces?${params.toString()}`);
    },
    [router, searchParams],
  );

  return (
    <div className="space-y-4">
      <form
        className="relative max-w-xl"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          updateParam("search", String(form.get("search") ?? "").trim() || null);
        }}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="search"
          name="search"
          className="h-11 pl-10 pr-24"
          aria-label="Rechercher une annonce"
          placeholder="Rechercher par titre ou référence…"
          defaultValue={searchParams.get("search") ?? ""}
        />
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1 h-9"
        >
          Rechercher
        </Button>
      </form>

      <div
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
        aria-label="Filtrer les annonces par statut"
      >
        <Button
          type="button"
          size="sm"
          variant={!searchParams.get("group") ? "default" : "outline"}
          onClick={() => updateParam("group", null)}
        >
          Toutes
        </Button>
        {STATUS_GROUPS.map((group) => (
          <Button
            key={group}
            type="button"
            size="sm"
            variant={searchParams.get("group") === group ? "default" : "outline"}
            onClick={() => updateParam("group", group)}
          >
            {group}
          </Button>
        ))}
      </div>
    </div>
  );
}
