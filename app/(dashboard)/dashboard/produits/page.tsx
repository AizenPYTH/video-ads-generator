import Link from "next/link";
import { Suspense } from "react";
import { PlusCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { fetchAnalyzedProducts } from "@/features/analyzed-products/queries";
import { ProductList } from "@/features/analyzed-products/components/product-list";
import { EmptyState } from "@/components/ads/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Produits analysés — SNOWOLF",
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
        title="Aucun produit analysé"
        description="Analysez des photos pour identifier vos produits automatiquement."
        actionLabel="Analyser des photos"
        actionHref="/dashboard/creer/photos"
      />
    );
  }

  return (
    <>
      <div className="rounded-xl border">
        <ProductList products={products} />
      </div>
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Button key={p} variant={p === page ? "default" : "outline"} size="sm" asChild>
              <Link href={`/dashboard/produits?page=${p}`}>{p}</Link>
            </Button>
          ))}
        </div>
      )}
    </>
  );
}

export default async function ProduitsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Produits analysés</h1>
          <p className="text-muted-foreground">
            Résultats d&apos;identification par intelligence artificielle
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/creer/photos">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nouvelle analyse
          </Link>
        </Button>
      </div>

      <Suspense fallback={<Skeleton className="h-64 rounded-xl" />}>
        <ProductsTable searchParams={params} />
      </Suspense>
    </div>
  );
}
