import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="px-0 pt-0 text-center">
        <CardTitle className="text-2xl tracking-tight">Retrouvez votre accès</CardTitle>
        <CardDescription>
          Nous vous enverrons un lien de réinitialisation par email.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <ForgotPasswordForm />
      </CardContent>
    </Card>
  );
}
