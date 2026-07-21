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

export const metadata = {
  title: "Paramètres — Smart Seller",
};

async function SettingsContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

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
          <TabsTrigger value="preferences">Préférences</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="marketing">Images marketing</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="profil">
        <Card>
          <CardHeader>
            <CardTitle>Informations personnelles</CardTitle>
            <CardDescription>
              Personnalisez votre identité et vos réglages régionaux.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm profile={profileRes.data} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="preferences">
        <Card>
          <CardHeader>
            <CardTitle>Préférences générales</CardTitle>
            <CardDescription>
              Choisissez la devise et le marché utilisés par défaut.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PreferencesForm settings={settingsRes.data} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="notifications">
        <Card>
          <CardHeader>
            <CardTitle>Notifications par e-mail</CardTitle>
            <CardDescription>
              Sélectionnez les événements pour lesquels vous souhaitez être averti.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NotificationForm settings={notifRes.data} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="marketing">
        <Card>
          <CardHeader>
            <CardTitle>Images marketing</CardTitle>
            <CardDescription>
              Configurez l’identité visuelle appliquée à vos supports.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MarketingSettings template={templatesRes.data?.[0] ?? null} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

export default function ParametresPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Paramètres"
        description="Gérez votre profil, vos préférences et vos notifications."
      />

      <p className="text-sm text-muted-foreground">
        Données de test sandbox ?{" "}
        <Link
          href="/dashboard/parametres/nettoyage"
          className="underline underline-offset-2 hover:text-foreground"
        >
          Aperçu dry-run et nettoyage manuel
        </Link>
      </p>

      <Suspense
        fallback={
          <div className="space-y-4" aria-label="Chargement des paramètres">
            <Skeleton className="h-11 rounded-lg" />
            <Skeleton className="h-96 rounded-xl" />
          </div>
        }
      >
        <SettingsContent />
      </Suspense>
    </div>
  );
}
