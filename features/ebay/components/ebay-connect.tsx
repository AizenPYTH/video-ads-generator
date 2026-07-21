"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Plug, Unplug } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { disconnectEbay } from "@/features/ebay/actions";
import { showDeveloperToolsClient } from "@/lib/ui/dev-tools-client";

type EbayConnectProps = {
  accounts: Array<{
    id: string;
    ebay_user_id: string;
    nom_compte: string | null;
    marche: string;
    est_actif: boolean;
  }>;
  /** sandbox | production — from server env (dev tools only) */
  ebayEnvironment?: string;
};

export function EbayConnect({
  accounts,
  ebayEnvironment = "sandbox",
}: EbayConnectProps) {
  const showDev = showDeveloperToolsClient();
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

  const connected = accounts.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Connectez votre compte eBay</CardTitle>
          <Badge variant={connected ? "success" : "secondary"}>
            {connected ? "Compte eBay connecté" : "Non connecté"}
          </Badge>
        </div>
        <CardDescription>
          Connectez votre compte vendeur eBay pour publier et gérer vos
          annonces depuis Smart Seller.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {showDev ? (
          <div
            className="rounded-[var(--ss-radius)] border border-dashed border-[var(--ss-border-strong)] bg-[var(--ss-surface-muted)] px-4 py-3 font-mono text-xs text-[var(--ss-text-muted)]"
            role="note"
          >
            <p className="font-sans text-[11px] font-semibold uppercase tracking-wide text-[var(--ss-warning)]">
              Outils développeur
            </p>
            <p className="mt-1">
              EBAY_ENVIRONMENT={ebayEnvironment} · masqué en production
              utilisateur (NEXT_PUBLIC_SHOW_DEVELOPER_TOOLS)
            </p>
          </div>
        ) : null}

        {!connected ? (
          <div className="rounded-[var(--ss-radius)] border border-dashed border-[var(--ss-border)] bg-[var(--ss-glacier-50)] p-6 text-center">
            <Unplug
              className="mx-auto mb-3 size-8 text-[var(--ss-glacier-500)]"
              aria-hidden="true"
            />
            <p className="font-medium text-[var(--ss-text)]">
              Aucun compte connecté
            </p>
            <p className="mt-1 text-sm text-[var(--ss-text-muted)]">
              Une connexion sécurisée vous permettra de publier vos annonces
              directement sur eBay France.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex flex-col gap-4 rounded-[var(--ss-radius)] border border-[var(--ss-border)] bg-[var(--ss-surface)] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <CheckCircle2
                    className="mt-0.5 size-5 shrink-0 text-[var(--ss-success)]"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 space-y-1">
                    <p className="truncate font-medium text-[var(--ss-text)]">
                      {account.nom_compte ?? account.ebay_user_id}
                    </p>
                    <ul className="space-y-0.5 text-sm text-[var(--ss-text-muted)]">
                      <li>
                        {account.marche === "EBAY_FR"
                          ? "eBay France"
                          : "Compte eBay"}
                        {account.est_actif
                          ? " · Synchronisation active"
                          : " · Connexion à renouveler"}
                      </li>
                      {account.est_actif ? (
                        <>
                          <li>Politiques de vente récupérées</li>
                          <li>Lieu d’expédition configuré</li>
                        </>
                      ) : null}
                    </ul>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                  onClick={() => setDisconnectAccountId(account.id)}
                  className="w-full sm:w-auto"
                >
                  Gérer la connexion
                </Button>
              </div>
            ))}
          </div>
        )}

        <Button asChild className="w-full sm:w-auto" disabled={isLoading}>
          <a href="/api/ebay/connect" onClick={() => setIsLoading(true)}>
            {isLoading ? (
              <Loader2
                className="mr-2 size-4 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Plug className="mr-2 size-4" aria-hidden="true" />
            )}
            {isLoading
              ? "Connexion en cours…"
              : connected
                ? "Connecter un autre compte"
                : "Connecter mon compte eBay"}
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
