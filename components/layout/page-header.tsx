import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col gap-5 border-b border-border/70 pb-6 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-[-0.025em] text-foreground md:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>
      )}
    </div>
  );
}
