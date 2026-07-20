import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="px-0 pt-0 text-center">
        <CardTitle className="text-2xl tracking-tight">Bon retour parmi nous</CardTitle>
        <CardDescription>
          Connectez-vous pour retrouver votre espace Smart Seller.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <LoginForm />
      </CardContent>
    </Card>
  );
}
