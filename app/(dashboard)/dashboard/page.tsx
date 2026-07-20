import Link from "next/link";
import { Suspense } from "react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  FileUp,
  Package,
  PlusCircle,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ads/empty-state";
import { AD_STATUS_LABELS } from "@/types/ads";
import type { AdStatut } from "@/types/database";

export const metadata = {
  title: "Tableau de bord — SNOWOLF",
};

async function DashboardStats() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [adsRes, productsRes, importsRes, publishedRes] = await Promise.all([
    supabase
      .from("ads")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("analyzed_products")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("product_import_batches")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("ads")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("statut", "PUBLISHED"),
  ]);

  const stats = [
    {
      label: "Annonces",
      value: adsRes.count ?? 0,
      icon: ShoppingBag,
      href: "/dashboard/annonces",
    },
    {
      label: "Produits analysés",
      value: productsRes.count ?? 0,
      icon: Package,
      href: "/dashboard/produits",
    },
    {
      label: "Imports",
      value: importsRes.count ?? 0,
      icon: FileUp,
      href: "/dashboard/imports",
    },
    {
      label: "Publiées",
      value: publishedRes.count ?? 0,
      icon: TrendingUp,
      href: "/dashboard/annonces?group=Publiées",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Link key={stat.label} href={stat.href}>
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-glacier-300" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-navy-900">{stat.value}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

async function RecentActivity() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: history } = await supabase
    .from("ad_history")
    .select("id, action, statut_apres, created_at, ad_id, ads(titre)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(8);

  if (!history?.length) {
    return (
      <EmptyState
        title="Aucune activité récente"
        description="Créez votre première annonce pour commencer."
        actionLabel="Créer une annonce"
        actionHref="/dashboard/creer"
      />
    );
  }

  return (
    <div className="divide-y divide-border rounded-xl border">
      {history.map((entry) => {
        const adData = entry.ads as { titre: string | null } | { titre: string | null }[] | null;
        const ad = Array.isArray(adData) ? adData[0] : adData;
        const statut = entry.statut_apres as AdStatut | null;
        const label = statut ? AD_STATUS_LABELS[statut] : entry.action;

        return (
          <div
            key={entry.id}
            className="flex items-center justify-between px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium">
                {ad?.titre ?? "Annonce sans titre"}
              </p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(entry.created_at), {
                addSuffix: true,
                locale: fr,
              })}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-xl" />
      ))}
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-14 rounded-lg" />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Tableau de bord</h1>
          <p className="text-muted-foreground">
            Vue d&apos;ensemble de votre activité eBay
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/creer">
            <PlusCircle className="mr-2 h-4 w-4" />
            Créer une annonce
          </Link>
        </Button>
      </div>

      <Suspense fallback={<StatsSkeleton />}>
        <DashboardStats />
      </Suspense>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Activité récente</h2>
        <Suspense fallback={<ActivitySkeleton />}>
          <RecentActivity />
        </Suspense>
      </div>
    </div>
  );
}
