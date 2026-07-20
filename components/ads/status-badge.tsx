import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type AdStatus =
  | "draft"
  | "analyzing"
  | "ready"
  | "publishing"
  | "published"
  | "failed"
  | "archived";

const statusConfig: Record<
  AdStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "glacier" }
> = {
  draft: { label: "Brouillon", variant: "secondary" },
  analyzing: { label: "Analyse en cours", variant: "glacier" },
  ready: { label: "Prêt à publier", variant: "default" },
  publishing: { label: "Publication en cours", variant: "glacier" },
  published: { label: "Publiée", variant: "default" },
  failed: { label: "Erreur", variant: "destructive" },
  archived: { label: "Archivée", variant: "outline" },
};

interface StatusBadgeProps {
  status: AdStatus;
  className?: string;
  label?: string;
}

export function StatusBadge({ status, className, label }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.draft;

  return (
    <Badge variant={config.variant} className={cn(className)}>
      {label ?? config.label}
    </Badge>
  );
}
