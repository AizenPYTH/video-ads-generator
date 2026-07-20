import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  icon?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  icon,
}: EmptyStateProps) {
  return (
    <div className="relative isolate flex flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-card px-6 py-14 text-center shadow-xs sm:py-16">
      <div
        className="pointer-events-none absolute inset-x-1/4 top-0 -z-10 h-32 rounded-full bg-glacier-100/70 blur-3xl"
        aria-hidden="true"
      />
      <div className="mb-5 flex size-14 items-center justify-center rounded-xl border border-glacier-300/30 bg-glacier-100 text-navy-700 shadow-xs">
        {icon ?? <FileQuestion className="h-7 w-7" />}
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {actionLabel && actionHref && (
        <Button asChild className="mt-6 shadow-sm">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      )}
    </div>
  );
}
