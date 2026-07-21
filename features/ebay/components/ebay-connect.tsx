"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Plug, Unplug } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { disconnectEbay } from "@/features/ebay/actions";

type EbayConnectProps = {
  accounts: Array<{
    id: string;
    ebay_user_id: string;
    nom_compte: string | null;
    marche: string;
    est_actif: boolean;
  }>;
  /** sandbox | production — from server env */
  ebayEnvironment?: string;
};

export function EbayConnect({
  accounts,
  ebayEnvironment = "sandbox",
}: EbayConnectProps) {
  const isSandbox = ebayEnvironment !== "production";
  const [isLoading, setIsLoading] = useState(false);
  const [disconnectAccountId, setDisconnectAccountId] = useState<string | null>(
    null,
  );

  async function handleDisconnect(accountId: string) {
    setIsLoading(true);
    try {
      const result = await disconnectEbay(accountId);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Compte eBay déconnecté.");
        setDisconnectAccountId(null);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Compte vendeur</CardTitle>
          <Badge variant={accounts.length > 0 ? "glacier" : "secondary"}>
            {accounts.length > 0 ? "Connecté" : "Non connecté"}
          </Badge>
        </div>
        <CardDescription>
          Autorisez Smart Seller à publier vos annonces sur eBay France.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isSandbox ? (
          <div
            className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
            role="status"
          >
            <p className="font-medium">Mode test eBay (Sandbox)</p>
            <p className="mt-1 text-amber-900/90">
              Vous devez vous connecter avec un{" "}
              <strong>compte test Sandbox</strong>, pas votre vrai compte
              eBay.fr. Votre mot de passe eBay réel sera refusé
              (« This password is incorrect »).
            </p>
            <p className="mt-2 text-amber-900/90">
              Créez un utilisateur test sur{" "}
              <a
                href="https://developer.ebay.com/my/auth?tab=sandbox"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                developer.ebay.com → Sandbox
              </a>
              , puis utilisez ce login/mot de passe sur la page eBay qui
              s’ouvre.
            </p>
          </div>
        ) : null}
        {accounts.length === 0 ? (
          <div className="rounded-lg border border-dashed p-5 text-center">
            <Unplug
              className="mx-auto mb-3 h-8 w-8 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="font-medium">Aucun compte connecté</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Connectez votre compte vendeur pour commencer à publier.
            </p>
          </div>
        ) : (
          accounts.map((account) => (
            <div
              key={account.id}
              className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-3">
                <CheckCircle2
                  className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {account.nom_compte ?? account.ebay_user_id}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {account.marche === "EBAY_FR" ? "eBay France" : "Compte eBay"}
                    {!account.est_actif && " · Connexion à renouveler"}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={isLoading}
                onClick={() => setDisconnectAccountId(account.id)}
                className="w-full sm:w-auto"
              >
                Déconnecter
              </Button>
            </div>
          ))
        )}

        <Button asChild className="w-full sm:w-auto" disabled={isLoading}>
          <a
            href="/api/ebay/connect"
            onClick={() => setIsLoading(true)}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Plug className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            {isLoading ? "Connexion en cours…" : "Connecter un compte eBay"}
          </a>
        </Button>
      </CardContent>
      <ConfirmationDialog
        open={disconnectAccountId !== null}
        onOpenChange={(open) => {
          if (!open) setDisconnectAccountId(null);
        }}
        onConfirm={() =>
          disconnectAccountId
            ? handleDisconnect(disconnectAccountId)
            : Promise.resolve()
        }
        title="Déconnecter ce compte eBay ?"
        description="Smart Seller ne pourra plus publier d’annonces avec ce compte tant qu’il ne sera pas reconnecté."
        confirmLabel="Déconnecter"
        destructive
        loading={isLoading}
      />
    </Card>
  );
}
