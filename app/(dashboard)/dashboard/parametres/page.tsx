import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/features/settings/components/profile-form";
import { PreferencesForm } from "@/features/settings/components/preferences-form";
import { NotificationForm } from "@/features/settings/components/notification-form";
import { MarketingSettings } from "@/features/settings/components/marketing-settings";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { showDeveloperTools } from "@/lib/ui/dev-tools";

export const metadata = {
  title: "Paramètres — Smart Seller",
};

async function SettingsContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const showDev = showDeveloperTools();

  const [profileRes, settingsRes, notifRes, templatesRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("notification_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("marketing_templates")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <Tabs defaultValue="profil" className="space-y-6">
      <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <TabsList className="w-max min-w-full justify-start sm:w-full">
          <TabsTrigger value="profil">Profil</TabsTrigger>
          <TabsTrigger value="ebay">eBay</TabsTrigger>
          <TabsTrigger value="publication">Publication</TabsTrigger>
          <TabsTrigger value="facturation">Facturation</TabsTrigger>
          <TabsTrigger value="apparence">Apparence</TabsTrigger>
          <TabsTrigger value="securite">Sécurité</TabsTrigger>
          {showDev ? (
            <TabsTrigger value="dev">Développeur</TabsTrigger>
          ) : null}
        </TabsList>
      </div>

      <TabsContent value="profil" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Profil</CardTitle>
            <CardDescription>
              Identité affichée dans Smart Seller et préférences régionales.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm profile={profileRes.data} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="ebay" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Compte eBay</CardTitle>
            <CardDescription>
              Gérez la connexion de votre compte vendeur depuis la page dédiée.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/dashboard/ebay"
              className="text-sm font-medium text-[var(--ss-glacier-500)] underline-offset-4 hover:underline"
            >
              Ouvrir la connexion eBay →
            </Link>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="publication" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Publication</CardTitle>
            <CardDescription>
              Marché et options utilisées lors de la préparation des annonces.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PreferencesForm settings={settingsRes.data} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Images marketing</CardTitle>
            <CardDescription>
              Identité visuelle appliquée à vos supports produits.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MarketingSettings template={templatesRes.data?.[0] ?? null} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="facturation" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Facturation</CardTitle>
            <CardDescription>
              Consultez et gérez votre formule Smart Seller.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/dashboard/abonnement"
              className="text-sm font-medium text-[var(--ss-glacier-500)] underline-offset-4 hover:underline"
            >
              Voir mon abonnement →
            </Link>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="apparence" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Apparence</CardTitle>
            <CardDescription>
              Le thème clair / sombre se règle depuis l’en-tête de l’application.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--ss-text-muted)]">
              Utilisez l’icône soleil / lune en haut à droite pour basculer le
              thème.
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="securite" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Sécurité</CardTitle>
            <CardDescription>
              Notifications et alertes liées à votre compte.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NotificationForm settings={notifRes.data} />
          </CardContent>
        </Card>
      </TabsContent>

      {showDev ? (
        <TabsContent value="dev" className="space-y-4">
          <Card className="border-dashed border-[var(--ss-warning)]/40">
            <CardHeader>
              <CardTitle className="text-[var(--ss-warning)]">
                Outils développeur
              </CardTitle>
              <CardDescription>
                Visible uniquement si NEXT_PUBLIC_SHOW_DEVELOPER_TOOLS=true.
                Ne jamais exposer aux vendeurs en production.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 font-mono text-xs text-[var(--ss-text-muted)]">
              <p>
                EBAY_ENVIRONMENT=
                {process.env.EBAY_ENVIRONMENT ?? "(non défini)"}
              </p>
              <Link
                href="/dashboard/parametres/nettoyage"
                className="inline-block font-sans text-sm font-medium text-[var(--ss-glacier-500)] underline-offset-4 hover:underline"
              >
                Nettoyage / dry-run →
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      ) : null}
    </Tabs>
  );
}

export default function ParametresPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Paramètres"
        description="Profil, publication, facturation et sécurité de votre compte."
      />

      <Suspense
        fallback={
          <div className="space-y-4" aria-label="Chargement des paramètres">
            <Skeleton className="h-11 rounded-lg" />
            <Skeleton className="h-96 rounded-[var(--ss-radius)]" />
          </div>
        }
      >
        <SettingsContent />
      </Suspense>
    </div>
  );
}
