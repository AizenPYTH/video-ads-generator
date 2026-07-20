"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp } from "@/features/auth/actions";

const signupSchema = z
  .object({
    fullName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
    email: z.string().email("Adresse email invalide"),
    password: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

type SignupFormValues = z.infer<typeof signupSchema>;

export function SignupForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  });

  async function onSubmit(data: SignupFormValues) {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("fullName", data.fullName);
      formData.append("email", data.email);
      formData.append("password", data.password);

      const result = await signUp(formData);

      if (result?.error) {
        toast.error(result.error);
        setIsLoading(false);
        return;
      }

      if (result?.success) {
        router.push(result.redirectTo || "/dashboard");
        router.refresh();
        return;
      }

      router.push("/verify-email");
    } catch {
      toast.error("La création du compte a échoué. Veuillez réessayer.");
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="fullName">Nom complet</Label>
        <Input
          id="fullName"
          type="text"
          placeholder="Jean Dupont"
          autoComplete="name"
          aria-invalid={Boolean(errors.fullName)}
          {...register("fullName")}
        />
        {errors.fullName && (
          <p className="text-xs leading-relaxed text-destructive" role="alert">
            {errors.fullName.message}
          </p>
        )}
      </div>

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

      <div className="space-y-2">
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
        {errors.password && (
          <p className="text-xs leading-relaxed text-destructive" role="alert">
            {errors.password.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.confirmPassword)}
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <p className="text-xs leading-relaxed text-destructive" role="alert">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      <LoadingButton
        type="submit"
        className="w-full"
        loading={isLoading}
        loadingText="Création du compte"
      >
        Créer mon compte
      </LoadingButton>

      <p className="text-center text-sm text-muted-foreground">
        Déjà un compte ?{" "}
        <Link href="/login" className="rounded-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
