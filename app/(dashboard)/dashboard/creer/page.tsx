import Link from "next/link";
import {
  ArrowRight,
  Camera,
  FileSpreadsheet,
  Link2,
  Lightbulb,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const choices = [
  {
    href: "/dashboard/creer/photos",
    icon: Camera,
    title: "À partir de photos",
    description:
      "Ajoutez vos images : Smart Seller prépare la fiche produit pour eBay.",
    cta: "Ajouter des photos",
    featured: true,
  },
  {
    href: "/dashboard/creer/import",
    icon: FileSpreadsheet,
    title: "À partir d’un fichier CSV / XLSX",
    description:
      "Importez un catalogue et créez plusieurs annonces en une seule passe.",
    cta: "Importer un fichier",
    featured: false,
  },
  {
    href: "/dashboard/creer/url",
    icon: Link2,
    title: "À partir d’une URL",
    description:
      "Collez le lien d’un produit ou d’une boutique (n’importe quel site e-commerce).",
    cta: "Importer depuis une URL",
    featured: false,
  },
];

export const metadata = {
  title: "Créer une annonce — Smart Seller",
};

export default function CreerPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Créer une annonce"
        description="Choisissez comment démarrer. Vous pourrez toujours compléter et publier ensuite."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {choices.map((choice) => (
          <Link
            key={choice.href}
            href={choice.href}
            className={cn(
              "group relative flex flex-col overflow-hidden rounded-[var(--ss-radius)] border outline-none transition-[border-color,box-shadow,transform] duration-200",
              "focus-visible:ring-2 focus-visible:ring-[var(--ss-glacier-500)] focus-visible:ring-offset-2",
              choice.featured
                ? "border-[var(--ss-glacier-400)] bg-[var(--ss-navy-800)] text-white shadow-[var(--ss-shadow-md)] lg:col-span-1 lg:min-h-[280px]"
                : "border-[var(--ss-border)] bg-[var(--ss-surface)] hover:-translate-y-0.5 hover:border-[var(--ss-glacier-300)] hover:shadow-[var(--ss-shadow-md)] motion-reduce:hover:translate-y-0",
            )}
          >
            {choice.featured && (
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_100%_0%,rgba(61,184,224,0.25),transparent_55%)]"
                aria-hidden
              />
            )}
            <div className="relative flex h-full flex-col p-6 sm:p-7">
              <div
                className={cn(
                  "mb-5 flex size-12 items-center justify-center rounded-lg",
                  choice.featured
                    ? "bg-white/10 text-[var(--ss-glacier-300)]"
                    : "bg-[var(--ss-glacier-100)] text-[var(--ss-navy-800)]",
                )}
              >
                <choice.icon className="size-6" aria-hidden="true" />
              </div>
              <h2
                className={cn(
                  "text-xl font-semibold tracking-tight",
                  choice.featured ? "text-white" : "text-[var(--ss-text)]",
                )}
              >
                {choice.title}
              </h2>
              <p
                className={cn(
                  "mt-2 text-sm leading-relaxed",
                  choice.featured
                    ? "text-white/70"
                    : "text-[var(--ss-text-muted)]",
                )}
              >
                {choice.description}
              </p>
              <span
                className={cn(
                  "mt-auto flex items-center gap-2 pt-8 text-sm font-semibold",
                  choice.featured
                    ? "text-[var(--ss-glacier-300)]"
                    : "text-[var(--ss-navy-700)]",
                )}
              >
                {choice.cta}
                <ArrowRight
                  className="size-4 transition-transform duration-200 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </span>
            </div>
          </Link>
        ))}
      </div>

      <aside className="rounded-[var(--ss-radius)] border border-[var(--ss-border)] bg-[var(--ss-glacier-50)] p-5 sm:p-6">
        <div className="flex gap-3">
          <Lightbulb
            className="mt-0.5 size-5 shrink-0 text-[var(--ss-glacier-500)]"
            aria-hidden
          />
          <div className="min-w-0 space-y-2">
            <h3 className="font-semibold text-[var(--ss-text)]">
              Conseil rapide
            </h3>
            <p className="text-sm leading-relaxed text-[var(--ss-text-muted)]">
              Pour un lot de produits, préférez l’import CSV. Pour un article
              unique, démarrez par les photos. Vérifiez toujours prix, stock et
              image avant de publier.
            </p>
            <Button variant="outline" size="sm" asChild className="mt-1">
              <Link href="/dashboard/annonces">Voir mes annonces</Link>
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}
