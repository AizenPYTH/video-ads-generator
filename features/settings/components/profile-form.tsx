"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/features/settings/actions";
import type { ProfilesRow } from "@/types/database";

type ProfileFormProps = {
  profile: ProfilesRow | null;
};

export function ProfileForm({ profile }: ProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit } = useForm({
    defaultValues: {
      prenom: profile?.prenom ?? "",
      nom: profile?.nom ?? "",
      langue: profile?.langue ?? "fr",
      fuseau_horaire: profile?.fuseau_horaire ?? "Europe/Paris",
    },
  });

  async function onSubmit(data: Record<string, string>) {
    setIsLoading(true);
    const result = await updateProfile({
      prenom: data.prenom || null,
      nom: data.nom || null,
      langue: data.langue,
      fuseau_horaire: data.fuseau_horaire,
    });
    if (result.error) toast.error(result.error);
    else toast.success("Profil mis à jour.");
    setIsLoading(false);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="prenom">Prénom</Label>
          <Input id="prenom" {...register("prenom")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nom">Nom</Label>
          <Input id="nom" {...register("nom")} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="langue">Langue</Label>
          <Input id="langue" {...register("langue")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fuseau_horaire">Fuseau horaire</Label>
          <Input id="fuseau_horaire" {...register("fuseau_horaire")} />
        </div>
      </div>
      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </form>
  );
}
