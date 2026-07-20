import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ImageIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge, type AdStatus } from "@/components/ads/status-badge";

export interface AdCardProps {
  id: string;
  title: string;
  price?: string;
  imageUrl?: string;
  status: AdStatus;
  statusLabel?: string;
  updatedAt?: string;
  href?: string;
}

export function AdCard({
  id,
  title,
  price,
  imageUrl,
  status,
  statusLabel,
  updatedAt,
  href,
}: AdCardProps) {
  const cardHref = href ?? `/dashboard/annonces/${id}`;

  return (
    <Card className="group overflow-hidden border-border/80 bg-card shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
      <Link href={cardHref}>
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <ImageIcon className="h-6 w-6" />
              Aucune image
            </div>
          )}
          <div className="absolute left-3 top-3">
            <StatusBadge status={status} label={statusLabel} />
          </div>
        </div>
      </Link>

      <CardContent className="space-y-3 p-4">
        <Link href={cardHref}>
          <h3 className="line-clamp-2 min-h-10 font-semibold leading-snug transition-colors hover:text-primary">
            {title}
          </h3>
        </Link>
        {price && (
          <p className="text-lg font-bold tracking-tight text-foreground">{price}</p>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-3 px-4 pb-4 pt-0">
        {updatedAt ? (
          <p className="text-xs text-muted-foreground">
            Modifié le {updatedAt}
          </p>
        ) : (
          <span />
        )}
        <Button variant="ghost" size="sm" asChild className="-mr-2">
          <Link href={cardHref}>
            Modifier
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
