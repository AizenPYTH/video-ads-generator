import Link from "next/link";
import { Suspense } from "react";
import { PlusCircle, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { fetchAnalyzedProducts } from "@/features/analyzed-products/queries";
import { ProductList } from "@/features/analyzed-products/components/product-list";
import { EmptyState } from "@/components/ads/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Produits analysés — Smart Seller",
};

type PageProps = {
  searchParams: Promise<{ page?: string; search?: string }>;
};

async function ProductsTable({
  searchParams,
}: {
  searchParams: Awaited<PageProps["searchParams"]>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const page = Number(searchParams.page) || 1;
  const { products, totalPages } = await fetchAnalyzedProducts(user.id, {
    page,
    search: searchParams.search,
  });

  if (products.length === 0) {
    return (
      <EmptyState
        title={searchParams.search ? "Aucun résultat" : "Aucun produit analysé"}
        description={
          searchParams.search
            ? "Essayez un autre terme ou effacez votre recherche."
            : "Analysez vos premières photos pour identifier un produit."
        }
        actionLabel={searchParams.search ? "Effacer la recherche" : "Analyser des photos"}
        actionHref={
          searchParams.search ? "/dashboard/produits" : "/dashboard/creer/photos"
        }
      />
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
        <ProductList products={products} />
      </div>
      {totalPages > 1 && (
        <nav aria-label="Pagination des produits" className="mt-6 flex flex-wrap justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Button key={p} variant={p === page ? "default" : "outline"} size="sm" asChild>
              <Link
                href={`/dashboard/produits?page=${p}${
                  searchParams.search
                    ? `&search=${encodeURIComponent(searchParams.search)}`
                    : ""
                }`}
                aria-current={p === page ? "page" : undefined}
              >
                {p}
              </Link>
            </Button>
          ))}
        </nav>
      )}
    </>
  );
}

export default async function ProduitsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produits analysés"
        description="Retrouvez les produits identifiés à partir de vos photos."
      >
        <Button asChild>
          <Link href="/dashboard/creer/photos">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nouvelle analyse
          </Link>
        </Button>
      </PageHeader>

      <form
        action="/dashboard/produits"
        method="get"
        role="search"
        className="flex max-w-xl gap-2"
      >
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            name="search"
            defaultValue={params.search ?? ""}
            placeholder="Rechercher par URL source…"
            aria-label="Rechercher un produit analysé"
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline">
          Rechercher
        </Button>
      </form>

      <Suspense
        fallback={
          <div className="space-y-3" aria-label="Chargement des produits">
            <Skeleton className="h-14 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        }
      >
        <ProductsTable searchParams={params} />
      </Suspense>
    </div>
  );
}
