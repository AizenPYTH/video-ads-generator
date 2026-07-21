import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold leading-none transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--ss-navy-800)] text-primary-foreground",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        outline:
          "border-[var(--ss-border)] bg-[var(--ss-surface)] text-foreground",
        success:
          "border-transparent bg-[var(--ss-success-bg)] text-[var(--ss-success)]",
        warning:
          "border-transparent bg-[var(--ss-warning-bg)] text-[var(--ss-warning)]",
        destructive:
          "border-transparent bg-[var(--ss-danger-bg)] text-[var(--ss-danger)]",
        glacier:
          "border-[var(--ss-glacier-300)]/40 bg-[var(--ss-glacier-100)] text-[var(--ss-navy-700)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
