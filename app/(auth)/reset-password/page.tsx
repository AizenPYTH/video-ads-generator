import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="px-0 pt-0 text-center">
        <CardTitle className="text-2xl tracking-tight">Nouveau mot de passe</CardTitle>
        <CardDescription>
          Choisissez un mot de passe d&apos;au moins 8 caractères.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <ResetPasswordForm />
      </CardContent>
    </Card>
  );
}
