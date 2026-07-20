import Link from "next/link";
import { ArrowRight, Camera, FileSpreadsheet, Link2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";

const choices = [
  {
    href: "/dashboard/creer/photos",
    icon: Camera,
    title: "Ajouter des photos",
    description:
      "Photographiez un produit ou ajoutez ses images pour l'identifier.",
  },
  {
    href: "/dashboard/creer/import",
    icon: FileSpreadsheet,
    title: "Importer un fichier",
    description:
      "Créez plusieurs annonces depuis un fichier CSV ou Excel.",
  },
  {
    href: "/dashboard/creer/url",
    icon: Link2,
    title: "Importer depuis un lien",
    description:
      "Récupérez les informations d'un produit depuis son adresse web.",
  },
];

export const metadata = {
  title: "Créer une annonce — Smart Seller",
};

export default function CreerPage() {
  return (
    <div className="space-y-7">
      <PageHeader
        title="Créer une annonce"
        description="Choisissez la méthode qui correspond à votre produit."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {choices.map((choice) => (
          <Link
            key={choice.href}
            href={choice.href}
            className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Card className="h-full min-h-56 border-border/70 bg-card transition-[border-color,box-shadow,transform] group-hover:-translate-y-1 group-hover:border-glacier-300/70 group-hover:shadow-lg motion-reduce:group-hover:translate-y-0">
              <CardContent className="flex h-full flex-col p-6">
                <div className="mb-6 flex size-14 items-center justify-center rounded-xl bg-glacier-100 text-navy-700">
                  <choice.icon className="size-7" aria-hidden="true" />
                </div>
                <CardTitle className="text-lg">{choice.title}</CardTitle>
                <CardDescription className="mt-2 leading-relaxed">
                  {choice.description}
                </CardDescription>
                <span className="mt-auto flex items-center gap-2 pt-6 text-sm font-semibold text-navy-700">
                  Commencer
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
