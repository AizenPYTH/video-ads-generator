import { Snowflake, Truck, ShieldCheck, Award, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/brand";

interface ListingTemplateProps {
  children?: React.ReactNode;
  className?: string;
  showBadges?: boolean;
}

const badges = [
  { icon: Truck, label: "Livraison gratuite" },
  { icon: ShieldCheck, label: "Produit testé" },
  { icon: Award, label: "Qualité premium" },
  { icon: Package, label: "Expédition soignée" },
];

export function ListingTemplate({
  children,
  className,
  showBadges = true,
}: ListingTemplateProps) {
  return (
    <div
      className={cn(
        "relative aspect-square w-full overflow-hidden rounded-xl bg-gradient-to-br from-navy-900 via-navy-700 to-navy-900",
        className
      )}
    >
      {/* French flag accent */}
      <div className="absolute left-0 top-0 flex h-full w-3 flex-col">
        <div className="flex-1 bg-[#002395]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#ED2939]" />
      </div>

      {/* Logo */}
      <div className="absolute left-6 top-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-glacier-300 text-navy-900">
          <Snowflake className="h-4 w-4" />
        </div>
        <span className="text-sm font-bold tracking-wide text-white">
          {APP_NAME}
        </span>
      </div>

      {/* Center product zone */}
      <div className="absolute inset-0 flex items-center justify-center p-12">
        <div className="flex h-3/5 w-3/5 items-center justify-center rounded-lg border-2 border-dashed border-white/20 bg-white/5 backdrop-blur-sm">
          {children ?? (
            <span className="text-sm text-white/40">Zone produit</span>
          )}
        </div>
      </div>

      {/* Badges */}
      {showBadges && (
        <div className="absolute bottom-4 left-0 right-0 flex flex-wrap justify-center gap-2 px-4">
          {badges.map((badge) => {
            const Icon = badge.icon;
            return (
              <div
                key={badge.label}
                className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm"
              >
                <Icon className="h-3 w-3 text-glacier-300" />
                {badge.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** @deprecated Utiliser ListingTemplate */
export const SnowolfTemplate = ListingTemplate;
