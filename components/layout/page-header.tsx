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
        "flex flex-col gap-5 pb-2 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-2">
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em] text-[var(--ss-text)] md:text-[2rem]">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-sm leading-relaxed text-[var(--ss-text-muted)] md:text-[15px]">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {children}
        </div>
      )}
    </div>
  );
}
