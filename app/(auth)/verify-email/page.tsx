import Link from "next/link";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function VerifyEmailPage() {
  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="px-0 pt-0 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-glacier-100">
          <Mail className="h-6 w-6 text-navy-700" aria-hidden="true" />
        </div>
        <CardTitle className="text-2xl tracking-tight">
          Compte presque prêt
        </CardTitle>
        <CardDescription className="leading-6">
          Aucun email de confirmation n&apos;est nécessaire. Revenez à la
          connexion avec le même email et mot de passe.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-0 pb-0">
        <Button asChild className="w-full">
          <Link href="/login">Se connecter</Link>
        </Button>
        <Button variant="outline" asChild className="w-full">
          <Link href="/signup">Créer un autre compte</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
