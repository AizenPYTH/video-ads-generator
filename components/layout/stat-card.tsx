import Link from "next/link";
import { type LucideIcon, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number | string;
  description?: string;
  trend?: string;
  icon?: LucideIcon;
  href?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  description,
  trend,
  icon: Icon,
  href,
  className,
}: StatCardProps) {
  const card = (
    <Card
      className={cn(
        "group h-full border-border/70 bg-card transition-[border-color,box-shadow,transform] duration-200",
        href && "hover:-translate-y-0.5 hover:border-glacier-300/60 hover:shadow-md motion-reduce:hover:translate-y-0",
        className,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium leading-none text-muted-foreground">
          {label}
        </CardTitle>
        {Icon && (
          <span className="flex size-9 items-center justify-center rounded-lg bg-glacier-100 text-navy-700">
            <Icon className="size-4" aria-hidden="true" />
          </span>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tracking-[-0.035em] text-foreground">
          {value}
        </div>
        {(description || trend) && (
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            {description && (
              <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
            )}
            {trend && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                <TrendingUp className="size-3" aria-hidden="true" />
                {trend}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (!href) return card;

  return (
    <Link
      href={href}
      className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {card}
    </Link>
  );
}
