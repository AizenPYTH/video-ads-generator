import Link from "next/link";
import { Suspense } from "react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Camera,
  CircleAlert,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  Link2,
  PlusCircle,
  Rocket,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { fetchDashboardStats } from "@/features/dashboard/queries";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ads/empty-state";
import { statusLabelFr } from "@/features/ads/recalculate-status";
import type { AdStatut, ImportBatchStatut } from "@/types/database";

export const metadata = {
  title: "Tableau de bord — Smart Seller",
};

const IMPORT_STATUS_LABELS: Record<ImportBatchStatut, string> = {
  PENDING: "Analyse en cours",
  PROCESSING: "Analyse en cours",
  COMPLETED: "Import terminé",
  FAILED: "Une erreur est survenue",
  PARTIAL: "Import terminé",
};

const ACTIVITY_LABELS: Record<string, string> = {
  CREATE: "Annonce créée",
  UPDATE: "Annonce mise à jour",
  DUPLICATE: "Annonce dupliquée",
  PUBLISH: "Annonce publiée",
};

const QUICK_ACTIONS = [
  {
    href: "/dashboard/creer/photos",
    label: "Ajouter des photos",
    icon: Camera,
  },
  {
    href: "/dashboard/creer/import",
    label: "Importer un fichier",
    icon: FileSpreadsheet,
  },
  {
    href: "/dashboard/creer/url",
    label: "Importer depuis un lien",
    icon: Link2,
  },
];

async function DashboardStats() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const dashboardStats = await fetchDashboardStats(user.id);

  const stats = [
    {
      label: "Brouillons",
      value: dashboardStats.drafts,
      description: "À compléter",
      icon: FileText,
      href: "/dashboard/annonces?group=Brouillons",
    },
    {
      label: "Prêtes",
      value: dashboardStats.ready,
      description: "Prêtes pour eBay",
      icon: Rocket,
      href: "/dashboard/annonces?group=Prêtes",
    },
    {
      label: "Publiées",
      value: dashboardStats.published,
      description: "En ligne sur eBay",
      icon: ClipboardCheck,
      href: "/dashboard/annonces?group=Publiées",
    },
    {
      label: "Produits à vérifier",
      value: dashboardStats.needsReview,
      description: "À revoir avant publication",
      icon: CircleAlert,
      href: "/dashboard/annonces?group=Brouillons",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.label} {...stat} />
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
    <div className="divide-y divide-border/60">
      {history.map((entry) => {
        const adData = entry.ads as
          | { titre: string | null }
          | { titre: string | null }[]
          | null;
        const ad = Array.isArray(adData) ? adData[0] : adData;
        const statut = entry.statut_apres as AdStatut | null;
        const label = statut
          ? statusLabelFr(statut)
          : ACTIVITY_LABELS[entry.action] ?? "Annonce mise à jour";

        return (
          <div
            key={entry.id}
            className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {ad?.titre ?? "Annonce sans titre"}
              </p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(entry.created_at), {
                addSuffix: true,
                locale: fr,
              })}
            </span>
          </div>
        );
      })}
    </div>
  );
}

async function RecentImports() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: batches } = await supabase
    .from("product_import_batches")
    .select("id, nom_fichier, statut, nombre_lignes, lignes_reussies, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  if (!batches?.length) {
    return (
      <EmptyState
        title="Aucun import récent"
        description="Ajoutez un fichier CSV ou Excel pour commencer."
        actionLabel="Importer un fichier"
        actionHref="/dashboard/creer/import"
      />
    );
  }

  return (
    <div className="divide-y divide-border/60">
      {batches.map((batch) => (
        <Link
          key={batch.id}
          href={`/dashboard/imports/${batch.id}`}
          className="flex flex-col gap-1.5 rounded-md py-3 outline-none transition-colors first:pt-0 last:pb-0 hover:text-navy-700 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{batch.nom_fichier}</p>
            <p className="text-sm text-muted-foreground">
              {batch.lignes_reussies}/{batch.nombre_lignes} lignes ·{" "}
              {IMPORT_STATUS_LABELS[batch.statut as ImportBatchStatut]}
            </p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(batch.created_at), {
              addSuffix: true,
              locale: fr,
            })}
          </span>
        </Link>
      ))}
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
        <Skeleton key={i} className="h-16 rounded-lg" />
      ))}
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("prenom, nom")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const firstName = profile?.prenom?.trim();

  return (
    <div className="space-y-7">
      <PageHeader
        title="Tableau de bord"
        description={
          firstName
            ? `Bonjour ${firstName}, gérez vos annonces eBay en un coup d'œil.`
            : "Gérez vos annonces eBay en un coup d'œil."
        }
      >
        <Button asChild>
          <Link href="/dashboard/creer">
            <PlusCircle className="mr-2 h-4 w-4" />
            Créer une annonce
          </Link>
        </Button>
      </PageHeader>

      <Suspense fallback={<StatsSkeleton />}>
        <DashboardStats />
      </Suspense>

      <section aria-labelledby="quick-start-title" className="space-y-3">
        <h2 id="quick-start-title" className="text-lg font-semibold tracking-tight">
          Commencer rapidement
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Card className="h-full border-border/70 transition-[border-color,box-shadow,transform] group-hover:-translate-y-0.5 group-hover:border-glacier-300/60 group-hover:shadow-md motion-reduce:group-hover:translate-y-0">
                  <CardContent className="flex items-center gap-3 p-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-glacier-100 text-navy-700">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-semibold">
                      {action.label}
                    </span>
                    <span className="text-sm font-medium text-navy-700" aria-hidden="true">
                      →
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Imports récents</CardTitle>
            <CardDescription>Vos derniers fichiers traités</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<ActivitySkeleton />}>
              <RecentImports />
            </Suspense>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Activité récente</CardTitle>
            <CardDescription>Les dernières évolutions de vos annonces</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<ActivitySkeleton />}>
              <RecentActivity />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
