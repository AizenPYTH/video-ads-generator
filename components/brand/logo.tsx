import Image from "next/image";
import Link from "next/link";
import { APP_NAME, BRAND_LOGO_PATH } from "@/lib/brand";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  href?: string | null;
  className?: string;
  /** Hauteur visuelle du logo (largeur auto). */
  height?: number;
  priority?: boolean;
};

export function BrandLogo({
  href = "/",
  className,
  height = 36,
  priority = false,
}: BrandLogoProps) {
  const image = (
    <Image
      src={BRAND_LOGO_PATH}
      alt={APP_NAME}
      width={Math.round(height * 3)}
      height={height}
      priority={priority}
      className={cn("h-auto w-auto object-contain", className)}
      style={{ height, width: "auto" }}
    />
  );

  if (!href) return image;

  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label={`${APP_NAME}, accueil`}
    >
      {image}
    </Link>
  );
}
