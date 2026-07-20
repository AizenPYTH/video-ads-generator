"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/features/auth/actions";

const forgotPasswordSchema = z.object({
  email: z.string().email("Adresse email invalide"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(data: ForgotPasswordFormValues) {
    setIsLoading(true);
    const formData = new FormData();
    formData.append("email", data.email);

    const result = await resetPassword(formData);

    if (result?.error) {
      toast.error(result.error);
      setIsLoading(false);
      return;
    }

    setIsSent(true);
    setIsLoading(false);
    toast.success("Email de réinitialisation envoyé");
  }

  if (isSent) {
    return (
      <div className="space-y-5 text-center" role="status">
        <p className="text-sm leading-6 text-muted-foreground">
          Si un compte existe avec cette adresse, vous recevrez un email avec
          les instructions pour réinitialiser votre mot de passe.
        </p>
        <Button variant="outline" asChild className="w-full">
          <Link href="/login">Retour à la connexion</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="vous@exemple.fr"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs leading-relaxed text-destructive" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>

      <LoadingButton
        type="submit"
        className="w-full"
        loading={isLoading}
        loadingText="Envoi en cours"
      >
        Envoyer le lien
      </LoadingButton>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="rounded-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Retour à la connexion
        </Link>
      </p>
    </form>
  );
}
