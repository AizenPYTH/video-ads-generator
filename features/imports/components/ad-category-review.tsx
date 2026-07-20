"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  redetectAdCategory,
  searchEbayCategories,
  updateImportAdCategory,
} from "@/features/imports/actions";

type CategoryResolution = {
  status?: string;
  categoryId?: string | null;
  categoryName?: string | null;
  rootCategoryName?: string | null;
  subcategoryName?: string | null;
  confidence?: number;
  taxonomySource?: string;
  alternatives?: Array<{
    categoryId: string;
    categoryName: string;
    confidence: number;
  }>;
  missingAspects?: string[];
  message?: string;
};

type Props = {
  adId: string;
  categoryId: string | null;
  resolution: CategoryResolution | null;
};

export function AdCategoryReview({ adId, categoryId, resolution }: Props) {
  const [query, setQuery] = useState("");
  const [showAlts, setShowAlts] = useState(false);
  const [results, setResults] = useState<
    Array<{ categoryId: string; categoryName: string; confidence: number }>
  >(resolution?.alternatives ?? []);
  const [pending, startTransition] = useTransition();
  const [activeAction, setActiveAction] = useState<string | null>(null);

  function confidenceLabel(value?: number) {
    if (value == null || value <= 0) return "—";
    return `${Math.round(value * 100)} %`;
  }

  function choose(id: string, name: string) {
    setActiveAction(`choose-${id}`);
    startTransition(async () => {
      try {
        const result = await updateImportAdCategory(adId, id, name);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Catégorie enregistrée.");
      } finally {
        setActiveAction(null);
      }
    });
  }

  function search() {
    setActiveAction("search");
    startTransition(async () => {
      try {
        const result = await searchEbayCategories(query);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        setResults(result.data ?? []);
        setShowAlts(true);
      } finally {
        setActiveAction(null);
      }
    });
  }

  function redetect() {
    setActiveAction("redetect");
    startTransition(async () => {
      try {
        const result = await redetectAdCategory(adId);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Analyse en cours");
        if (result.data?.alternatives?.length) {
          setResults(result.data.alternatives);
        }
      } finally {
        setActiveAction(null);
      }
    });
  }

  const detectedName =
    resolution?.categoryName ||
    resolution?.subcategoryName ||
    categoryId ||
    "Non trouvée";
  const subcategory =
    resolution?.subcategoryName || resolution?.categoryName || "—";
  const root = resolution?.rootCategoryName || "—";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Catégorie eBay</CardTitle>
        <CardDescription>
          Vérifiez ou modifiez la catégorie proposée avant la publication.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Catégorie détectée : </span>
            {detectedName}
          </p>
          <p>
            <span className="text-muted-foreground">Catégorie racine : </span>
            {root}
          </p>
          <p>
            <span className="text-muted-foreground">Sous-catégorie : </span>
            {subcategory}
          </p>
          <p>
            <span className="text-muted-foreground">Confiance : </span>
            {confidenceLabel(resolution?.confidence)}
            {resolution?.status === "needs_review" && (
              <Badge variant="outline" className="ml-2">
                À vérifier
              </Badge>
            )}
            {resolution?.status === "resolved" && (
              <Badge variant="default" className="ml-2">
                Prêt à publier
              </Badge>
            )}
          </p>
          {resolution?.missingAspects && resolution.missingAspects.length > 0 && (
            <p className="text-amber-700">
              Champs eBay manquants : {resolution.missingAspects.join(", ")}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="category-search">Rechercher une catégorie eBay</Label>
          <div className="flex flex-wrap gap-2">
            <Input
              id="category-search"
              placeholder="Ex. : chaussures de randonnée"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") search();
              }}
              className="min-w-[200px] flex-1"
            />
          <Button
            variant="outline"
            onClick={search}
            disabled={pending || !query.trim()}
            aria-busy={activeAction === "search"}
          >
            {activeAction === "search" && (
              <Loader2 className="animate-spin" aria-hidden="true" />
            )}
            Rechercher
          </Button>
          <Button
            variant="ghost"
            onClick={() => setShowAlts((v) => !v)}
            disabled={pending}
          >
            Voir les alternatives
          </Button>
            <Button
              variant="secondary"
              onClick={redetect}
              disabled={pending}
              aria-busy={activeAction === "redetect"}
            >
              {activeAction === "redetect" && (
                <Loader2 className="animate-spin" aria-hidden="true" />
              )}
              Relancer l’analyse
            </Button>
          </div>
        </div>

        {showAlts && results.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Autres catégories proposées</p>
            <ul className="space-y-2">
              {results.map((alt) => (
                <li
                  key={alt.categoryId}
                  className="flex items-center justify-between gap-2 rounded border p-2"
                >
                  <div>
                    <p className="font-medium">{alt.categoryName}</p>
                    <p className="text-xs text-muted-foreground">
                      Confiance {confidenceLabel(alt.confidence)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() => choose(alt.categoryId, alt.categoryName)}
                    aria-busy={activeAction === `choose-${alt.categoryId}`}
                  >
                    {activeAction === `choose-${alt.categoryId}` && (
                      <Loader2 className="animate-spin" aria-hidden="true" />
                    )}
                    Choisir
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {showAlts && results.length === 0 && (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Aucune autre catégorie trouvée.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
