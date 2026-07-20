import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, prenom, nom")
    .eq("id", user.id)
    .maybeSingle();

  const fullName =
    profile?.prenom || profile?.nom
      ? [profile.prenom, profile.nom].filter(Boolean).join(" ")
      : undefined;

  return (
    <DashboardShell
      user={{
        email: profile?.email ?? user.email,
        fullName,
      }}
    >
      {children}
    </DashboardShell>
  );
}
