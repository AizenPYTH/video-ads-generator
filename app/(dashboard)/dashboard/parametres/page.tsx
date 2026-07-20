import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/features/settings/components/profile-form";
import { PreferencesForm } from "@/features/settings/components/preferences-form";
import { NotificationForm } from "@/features/settings/components/notification-form";
import { MarketingSettings } from "@/features/settings/components/marketing-settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Paramètres — SNOWOLF",
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
      <TabsList>
        <TabsTrigger value="profil">Profil</TabsTrigger>
        <TabsTrigger value="preferences">Préférences</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
        <TabsTrigger value="marketing">Images marketing</TabsTrigger>
      </TabsList>

      <TabsContent value="profil">
        <ProfileForm profile={profileRes.data} />
      </TabsContent>

      <TabsContent value="preferences">
        <PreferencesForm settings={settingsRes.data} />
      </TabsContent>

      <TabsContent value="notifications">
        <NotificationForm settings={notifRes.data} />
      </TabsContent>

      <TabsContent value="marketing">
        <MarketingSettings template={templatesRes.data?.[0] ?? null} />
      </TabsContent>
    </Tabs>
  );
}

export default function ParametresPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Paramètres</h1>
        <p className="text-muted-foreground">
          Gérez votre compte et vos préférences
        </p>
      </div>

      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <SettingsContent />
      </Suspense>
    </div>
  );
}
