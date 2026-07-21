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
    <div className="relative isolate flex flex-col items-center justify-center overflow-hidden rounded-[var(--ss-radius)] border border-dashed border-[var(--ss-border)] bg-[var(--ss-surface)] px-6 py-14 text-center shadow-[var(--ss-shadow-sm)] sm:py-16">
      <div
        className="pointer-events-none absolute inset-x-1/4 top-0 -z-10 h-32 rounded-full bg-[var(--ss-glacier-100)]/80 blur-3xl"
        aria-hidden="true"
      />
      <div className="mb-5 flex size-14 items-center justify-center rounded-lg border border-[var(--ss-glacier-300)]/30 bg-[var(--ss-glacier-100)] text-[var(--ss-navy-800)]">
        {icon ?? <FileQuestion className="size-7" />}
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-[var(--ss-text)]">
        {title}
      </h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--ss-text-muted)]">
        {description}
      </p>
      {actionLabel && actionHref && (
        <Button asChild className="mt-6">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      )}
    </div>
  );
}
