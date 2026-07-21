import Link from "next/link";
import { Suspense } from "react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowRight,
  CircleAlert,
  PlusCircle,
  Store,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { fetchDashboardStats } from "@/features/dashboard/queries";
import { PageHeader } from "@/components/layout/page-header";
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
import { cn } from "@/lib/utils";

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

async function WelcomePanel({ firstName }: { firstName?: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [stats, ebayRes] = await Promise.all([
    fetchDashboardStats(user.id),
    supabase
      .from("ebay_accounts")
      .select("id, is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle(),
  ]);

  const ebayConnected = Boolean(ebayRes.data);

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <section className="relative overflow-hidden rounded-[var(--ss-radius)] border border-[var(--ss-border)] bg-[var(--ss-navy-800)] p-6 text-white shadow-[var(--ss-shadow-md)] lg:col-span-8 sm:p-8">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_100%_0%,rgba(61,184,224,0.28),transparent_50%)]"
          aria-hidden
        />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ss-glacier-300)]">
            Tableau de bord
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            {firstName
              ? `Bonjour ${firstName}`
              : "Bienvenue sur Smart Seller"}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
            {stats.ready > 0
              ? `${stats.ready} annonce${stats.ready > 1 ? "s" : ""} prête${stats.ready > 1 ? "s" : ""} à publier. ${stats.drafts} brouillon${stats.drafts > 1 ? "s" : ""} en cours.`
              : "Créez ou importez des annonces, puis publiez-les sur eBay depuis un seul espace."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="glacier" asChild>
              <Link href="/dashboard/creer">
                <PlusCircle className="mr-2 size-4" />
                Créer une annonce
              </Link>
            </Button>
            <Button
              variant="outline"
              asChild
              className="border-white/25 bg-transparent text-white hover:bg-white/10"
            >
              <Link href="/dashboard/annonces">
                Voir mes annonces
                <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <aside className="flex flex-col gap-4 lg:col-span-4">
        <Card className="flex-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Compte eBay</CardTitle>
            <CardDescription>
              {ebayConnected
                ? "Synchronisation active"
                : "Connexion requise pour publier"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex size-10 items-center justify-center rounded-lg",
                  ebayConnected
                    ? "bg-[var(--ss-success-bg)] text-[var(--ss-success)]"
                    : "bg-[var(--ss-warning-bg)] text-[var(--ss-warning)]",
                )}
              >
                <Store className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--ss-text)]">
                  {ebayConnected ? "Connecté" : "Non connecté"}
                </p>
                <Link
                  href="/dashboard/ebay"
                  className="text-xs font-medium text-[var(--ss-glacier-500)] hover:underline"
                >
                  {ebayConnected ? "Gérer la connexion" : "Connecter mon compte"}
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {stats.errors > 0 ? (
          <Card className="border-[var(--ss-danger)]/25 bg-[var(--ss-danger-bg)]">
            <CardContent className="flex items-start gap-3 p-4">
              <CircleAlert
                className="mt-0.5 size-5 shrink-0 text-[var(--ss-danger)]"
                aria-hidden
              />
              <div>
                <p className="text-sm font-semibold text-[var(--ss-danger)]">
                  {stats.errors} erreur{stats.errors > 1 ? "s" : ""} à corriger
                </p>
                <Link
                  href="/dashboard/annonces?group=Erreurs"
                  className="mt-1 inline-block text-xs font-medium text-[var(--ss-danger)] underline-offset-2 hover:underline"
                >
                  Voir les annonces concernées
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </aside>
    </div>
  );
}

async function MetricsStrip() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const stats = await fetchDashboardStats(user.id);
  const items = [
    { label: "Total", value: stats.totalAds },
    { label: "Brouillons", value: stats.drafts },
    { label: "Prêtes", value: stats.ready },
    { label: "Publiées", value: stats.published },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-[var(--ss-radius)] border border-[var(--ss-border)] bg-[var(--ss-surface)] px-4 py-3 shadow-[var(--ss-shadow-sm)]"
        >
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--ss-text-muted)]">
            {item.label}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--ss-text)]">
            {item.value}
          </p>
        </div>
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
    <div className="divide-y divide-[var(--ss-border)]">
      {history.map((entry) => {
        const adData = entry.ads as
          | { titre: string | null }
          | { titre: string | null }[]
          | null;
        const ad = Array.isArray(adData) ? adData[0] : adData;
        const statut = entry.statut_apres as AdStatut | null;
        const label = statut
          ? statusLabelFr(statut)
          : (ACTIVITY_LABELS[entry.action] ?? "Annonce mise à jour");

        return (
          <div
            key={entry.id}
            className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">{ad?.titre ?? "Annonce sans titre"}</p>
              <p className="text-sm text-[var(--ss-text-muted)]">{label}</p>
            </div>
            <span className="shrink-0 text-xs text-[var(--ss-text-muted)]">
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
    <div className="divide-y divide-[var(--ss-border)]">
      {batches.map((batch) => (
        <Link
          key={batch.id}
          href={`/dashboard/imports/${batch.id}`}
          className="flex flex-col gap-1.5 rounded-md py-3 outline-none transition-colors first:pt-0 last:pb-0 hover:text-[var(--ss-navy-700)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{batch.nom_fichier}</p>
            <p className="text-sm text-[var(--ss-text-muted)]">
              {batch.lignes_reussies}/{batch.nombre_lignes} lignes ·{" "}
              {IMPORT_STATUS_LABELS[batch.statut as ImportBatchStatut]}
            </p>
          </div>
          <span className="shrink-0 text-xs text-[var(--ss-text-muted)]">
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

function PanelSkeleton() {
  return <Skeleton className="h-48 w-full rounded-[var(--ss-radius)]" />;
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
        description="Vue d’ensemble de votre activité vendeur."
      />

      <Suspense fallback={<PanelSkeleton />}>
        <WelcomePanel firstName={firstName} />
      </Suspense>

      <Suspense
        fallback={
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-[var(--ss-radius)]" />
            ))}
          </div>
        }
      >
        <MetricsStrip />
      </Suspense>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Imports récents</CardTitle>
            <CardDescription>Derniers fichiers traités</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<PanelSkeleton />}>
              <RecentImports />
            </Suspense>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activité récente</CardTitle>
            <CardDescription>Évolutions de vos annonces</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<PanelSkeleton />}>
              <RecentActivity />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
