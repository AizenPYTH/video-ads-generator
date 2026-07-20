import Link from "next/link";
import { Camera, FileSpreadsheet, Link2 } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const choices = [
  {
    href: "/dashboard/creer/photos",
    icon: Camera,
    title: "Photos",
    description:
      "Prenez ou importez des photos de votre produit. SNOWOLF l'identifie automatiquement.",
  },
  {
    href: "/dashboard/creer/import",
    icon: FileSpreadsheet,
    title: "Fichier CSV ou Excel",
    description:
      "Importez plusieurs annonces d'un coup depuis un tableur.",
  },
  {
    href: "/dashboard/creer/url",
    icon: Link2,
    title: "Lien web",
    description:
      "Collez l'URL d'un produit existant pour récupérer ses informations.",
  },
];

export const metadata = {
  title: "Créer une annonce — SNOWOLF",
};

export default function CreerPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Créer une annonce</h1>
        <p className="text-muted-foreground">
          Choisissez comment vous souhaitez commencer
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {choices.map((choice) => (
          <Link key={choice.href} href={choice.href}>
            <Card className="h-full transition-all hover:border-glacier-300 hover:shadow-md">
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-glacier-300/20 text-glacier-300">
                  <choice.icon className="h-6 w-6" />
                </div>
                <CardTitle>{choice.title}</CardTitle>
                <CardDescription>{choice.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
