import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getEbayAccounts } from "@/features/ebay/actions";
import { EbayConnect } from "@/features/ebay/components/ebay-connect";
import { EbaySettings } from "@/features/ebay/components/ebay-settings";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Compte eBay — SNOWOLF",
};

async function EbayContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const accountsResult = await getEbayAccounts();
  const accounts = accountsResult.data ?? [];

  const { data: settings } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <EbayConnect accounts={accounts} />
      <EbaySettings settings={settings} />
    </div>
  );
}

export default function EbayPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Compte eBay</h1>
        <p className="text-muted-foreground">
          Connectez votre compte vendeur eBay pour publier vos annonces
        </p>
      </div>

      <Suspense
        fallback={
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        }
      >
        <EbayContent />
      </Suspense>
    </div>
  );
}
