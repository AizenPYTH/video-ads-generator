import { createClient } from "@/lib/supabase/server";
import type { AnalyzedProductsRow } from "@/types/database";

export type ProductFilter =
  | "Tous"
  | "Identifiés"
  | "À vérifier"
  | "Erreurs"
  | "Sans annonce";

export type ProductFilters = {
  filter?: ProductFilter;
  search?: string;
  page?: number;
  limit?: number;
};

export type PaginatedProducts = {
  products: AnalyzedProductsRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export async function fetchAnalyzedProducts(
  userId: string,
  filters: ProductFilters = {},
): Promise<PaginatedProducts> {
  const supabase = await createClient();
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("analyzed_products")
    .select("*", { count: "exact" })
    .eq("user_id", userId);

  switch (filters.filter) {
    case "Identifiés":
      query = query.eq("necessite_revision", false).is("ad_id", null);
      break;
    case "À vérifier":
      query = query.eq("necessite_revision", true);
      break;
    case "Sans annonce":
      query = query.is("ad_id", null);
      break;
    case "Erreurs":
      query = query.lt("confiance_globale", "0.3");
      break;
    default:
      break;
  }

  if (filters.search?.trim()) {
    query = query.ilike("url_source", `%${filters.search.trim()}%`);
  }

  query = query.order("created_at", { ascending: false });
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Échec de la récupération des produits : ${error.message}`);
  }

  const total = count ?? 0;

  return {
    products: (data ?? []) as AnalyzedProductsRow[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function fetchAnalyzedProductById(
  userId: string,
  productId: string,
): Promise<AnalyzedProductsRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("analyzed_products")
    .select("*")
    .eq("user_id", userId)
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    throw new Error(`Échec de la récupération du produit : ${error.message}`);
  }

  return data as AnalyzedProductsRow | null;
}
