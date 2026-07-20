import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { fetchAdById } from "@/features/ads/queries";
import { AdForm } from "@/features/ads/components/ad-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Modifier l'annonce — Smart Seller",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ModifierAnnoncePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const ad = await fetchAdById(user.id, id);
  if (!ad) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/dashboard/annonces/${id}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour à l&apos;annonce
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Modifier l&apos;annonce</h1>
        <p className="text-muted-foreground">
          Mettez à jour les informations de votre annonce
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations de l&apos;annonce</CardTitle>
        </CardHeader>
        <CardContent>
          <AdForm ad={ad} />
        </CardContent>
      </Card>
    </div>
  );
}
