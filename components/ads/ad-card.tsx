import Image from "next/image";
import Link from "next/link";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge, type AdStatus } from "@/components/ads/status-badge";

export interface AdCardProps {
  id: string;
  title: string;
  price?: string;
  imageUrl?: string;
  status: AdStatus;
  updatedAt?: string;
  href?: string;
}

export function AdCard({
  id,
  title,
  price,
  imageUrl,
  status,
  updatedAt,
  href,
}: AdCardProps) {
  const cardHref = href ?? `/dashboard/annonces/${id}`;

  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-md">
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
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Aucune image
            </div>
          )}
          <div className="absolute left-3 top-3">
            <StatusBadge status={status} />
          </div>
        </div>
      </Link>

      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <Link href={cardHref} className="flex-1">
            <h3 className="line-clamp-2 font-medium leading-snug hover:text-primary">
              {title}
            </h3>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={cardHref}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Modifier
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-2">
        {price && (
          <p className="text-lg font-semibold text-navy-900">{price}</p>
        )}
      </CardContent>

      {updatedAt && (
        <CardFooter className="px-4 pb-4 pt-0">
          <p className="text-xs text-muted-foreground">
            Modifié le {updatedAt}
          </p>
        </CardFooter>
      )}
    </Card>
  );
}
