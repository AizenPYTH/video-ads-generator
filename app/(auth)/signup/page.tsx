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
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-2xl">Créer un compte</CardTitle>
        <CardDescription>
          Commencez à créer des annonces eBay intelligentes
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <SignupForm />
      </CardContent>
    </Card>
  );
}
