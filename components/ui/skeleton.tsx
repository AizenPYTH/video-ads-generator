import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-lg bg-gradient-to-r from-muted via-accent/65 to-muted bg-[length:200%_100%] motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
