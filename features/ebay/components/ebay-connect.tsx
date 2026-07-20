"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { connectEbay, disconnectEbay } from "@/features/ebay/actions";

type EbayConnectProps = {
  accounts: Array<{
    id: string;
    ebay_user_id: string;
    nom_compte: string | null;
    marche: string;
    est_actif: boolean;
  }>;
};

export function EbayConnect({ accounts }: EbayConnectProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleDisconnect(accountId: string) {
    setIsLoading(true);
    const result = await disconnectEbay(accountId);
    if (result.error) toast.error(result.error);
    else toast.success("Compte eBay déconnecté.");
    setIsLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connexion eBay</CardTitle>
        <CardDescription>
          Connectez votre compte eBay France pour publier vos annonces.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun compte eBay connecté.
          </p>
        ) : (
          accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div>
                <p className="font-medium">
                  {account.nom_compte ?? account.ebay_user_id}
                </p>
                <p className="text-sm text-muted-foreground">{account.marche}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={isLoading}
                onClick={() => handleDisconnect(account.id)}
              >
                Déconnecter
              </Button>
            </div>
          ))
        )}

        <form action={connectEbay}>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Connexion..." : "Connecter eBay"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
