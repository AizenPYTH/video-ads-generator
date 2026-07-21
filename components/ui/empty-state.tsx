import Link from "next/link";
import { type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[var(--ss-radius)] border border-dashed border-[var(--ss-border)] bg-[var(--ss-surface)] px-6 py-14 text-center",
        className,
      )}
      role="status"
    >
      {Icon ? (
        <span className="mb-4 flex size-12 items-center justify-center rounded-lg bg-[var(--ss-glacier-100)] text-[var(--ss-glacier-500)]">
          <Icon className="size-6" aria-hidden />
        </span>
      ) : null}
      <h3 className="text-base font-semibold text-[var(--ss-text)]">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--ss-text-muted)]">
        {description}
      </p>
      {actionLabel && actionHref ? (
        <Button asChild className="mt-5" size="sm">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}
