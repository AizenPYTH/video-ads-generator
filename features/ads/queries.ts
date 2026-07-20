import { createClient } from "@/lib/supabase/server";
import type { AdStatus } from "@/types/ads";
import type { AdsRow } from "@/types/database";
import { getStatusesForGroup, type AdStatusGroup } from "./status";

export type AdFilters = {
  search?: string;
  statut?: AdStatus | AdStatus[];
  group?: AdStatusGroup;
  page?: number;
  limit?: number;
  sortBy?: "created_at" | "updated_at" | "titre";
  sortOrder?: "asc" | "desc";
};

export type PaginatedAds = {
  ads: AdsRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export async function fetchAds(
  userId: string,
  filters: AdFilters = {},
): Promise<PaginatedAds> {
  const supabase = await createClient();
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("ads")
    .select("*", { count: "exact" })
    .eq("user_id", userId);

  if (filters.group) {
    const statuses = getStatusesForGroup(filters.group);
    query = query.in("statut", statuses);
  } else if (filters.statut) {
    const statuses = Array.isArray(filters.statut)
      ? filters.statut
      : [filters.statut];
    query = query.in("statut", statuses);
  }

  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    query = query.or(`titre.ilike.${term},sku.ilike.${term},notes.ilike.${term}`);
  }

  const sortBy = filters.sortBy ?? "updated_at";
  const sortOrder = filters.sortOrder ?? "desc";
  query = query.order(sortBy, { ascending: sortOrder === "asc" });
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Échec de la récupération des annonces : ${error.message}`);
  }

  const total = count ?? 0;

  return {
    ads: (data ?? []) as AdsRow[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function fetchAdById(
  userId: string,
  adId: string,
): Promise<AdsRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ads")
    .select("*")
    .eq("user_id", userId)
    .eq("id", adId)
    .maybeSingle();

  if (error) {
    throw new Error(`Échec de la récupération de l'annonce : ${error.message}`);
  }

  return data as AdsRow | null;
}
