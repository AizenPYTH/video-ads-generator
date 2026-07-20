import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { fetchAnalyzedProductById } from "@/features/analyzed-products/queries";
import { ProductDetail } from "@/features/analyzed-products/components/product-detail";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Détail produit — Smart Seller",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProduitDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const product = await fetchAnalyzedProductById(user.id, id);
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard/produits">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Produits analysés
        </Link>
      </Button>
      <ProductDetail product={product} />
    </div>
  );
}
