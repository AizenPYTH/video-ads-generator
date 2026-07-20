"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, Save, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageDropzone } from "@/components/uploads/image-dropzone";
import { uploadImage } from "@/components/uploads/upload-image";
import { updateProfile } from "@/features/settings/actions";
import type { ProfilesRow } from "@/types/database";

type ProfileFormProps = {
  profile: ProfilesRow | null;
};

export function ProfileForm({ profile }: ProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [avatarFiles, setAvatarFiles] = useState<File[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    profile?.avatar_url ?? null,
  );
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
    try {
      const nextAvatarUrl = avatarFiles[0]
        ? await uploadImage(avatarFiles[0], "avatars")
        : avatarUrl;
      const result = await updateProfile({
        prenom: data.prenom || null,
        nom: data.nom || null,
        langue: data.langue,
        fuseau_horaire: data.fuseau_horaire,
        avatar_url: nextAvatarUrl,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        setAvatarUrl(nextAvatarUrl);
        setAvatarFiles([]);
        toast.success("Profil mis à jour.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Impossible d'envoyer l'avatar.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <fieldset className="space-y-3" disabled={isLoading}>
        <legend className="text-sm font-medium">Photo de profil</legend>
        {avatarUrl && avatarFiles.length === 0 && (
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Avatar className="h-16 w-16">
              <AvatarImage src={avatarUrl} alt="Avatar actuel" />
              <AvatarFallback>
                <UserRound aria-hidden="true" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium">Avatar actuel</p>
              <p className="text-xs text-muted-foreground">
                Sélectionnez une image pour le remplacer.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Retirer l'avatar"
              onClick={() => setAvatarUrl(null)}
            >
              <X aria-hidden="true" />
            </Button>
          </div>
        )}
        <ImageDropzone
          files={avatarFiles}
          onFilesChange={setAvatarFiles}
          maxFiles={1}
          disabled={isLoading}
          label={avatarUrl ? "Remplacer l’avatar" : "Ajouter un avatar"}
        />
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="prenom">Prénom</Label>
          <Input id="prenom" disabled={isLoading} {...register("prenom")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nom">Nom</Label>
          <Input id="nom" disabled={isLoading} {...register("nom")} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="langue">Langue</Label>
          <select
            id="langue"
            disabled={isLoading}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            {...register("langue")}
          >
            <option value="fr">Français</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="fuseau_horaire">Fuseau horaire</Label>
          <select
            id="fuseau_horaire"
            disabled={isLoading}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            {...register("fuseau_horaire")}
          >
            <option value="Europe/Paris">Paris (heure française)</option>
          </select>
        </div>
      </div>
      <Button type="submit" disabled={isLoading}>
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Save className="mr-2 h-4 w-4" aria-hidden="true" />
        )}
        {isLoading ? "Enregistrement…" : "Enregistrer le profil"}
      </Button>
    </form>
  );
}
