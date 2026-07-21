import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { CleanupPanel } from "@/features/settings/components/cleanup-panel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { showDeveloperTools } from "@/lib/ui/dev-tools";

export const metadata = {
  title: "Outils développeur — Smart Seller",
};

export default function NettoyagePage() {
  if (!showDeveloperTools()) {
    redirect("/dashboard/parametres");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Outils développeur"
        description="Panneau interne. Invisible sans NEXT_PUBLIC_SHOW_DEVELOPER_TOOLS=true."
      />
      <p className="text-sm text-[var(--ss-text-muted)]">
        <Link
          href="/dashboard/parametres"
          className="underline underline-offset-2 hover:text-[var(--ss-text)]"
        >
          ← Retour aux paramètres
        </Link>
      </p>
      <Card className="border-dashed border-[var(--ss-warning)]/40">
        <CardHeader>
          <CardTitle>Données de test</CardTitle>
          <CardDescription>
            Compteurs pour votre compte uniquement. Confirmation obligatoire :{" "}
            <code className="font-mono text-xs">SUPPRIMER LES DONNÉES DE TEST</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CleanupPanel />
        </CardContent>
      </Card>
    </div>
  );
}
