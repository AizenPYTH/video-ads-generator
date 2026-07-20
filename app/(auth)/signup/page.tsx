import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignupForm } from "@/features/auth/components/signup-form";

export default function SignupPage() {
  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="px-0 pt-0 text-center">
        <CardTitle className="text-2xl tracking-tight">Créez votre espace</CardTitle>
        <CardDescription>
          Commencez gratuitement à préparer vos annonces eBay.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <SignupForm />
      </CardContent>
    </Card>
  );
}
