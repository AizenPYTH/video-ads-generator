import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[calc(var(--ss-radius)-2px)] text-sm font-semibold transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-50 motion-reduce:transition-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--ss-navy-800)] text-primary-foreground shadow-[var(--ss-shadow-sm)] hover:bg-[var(--ss-navy-700)] hover:shadow-[var(--ss-shadow-md)]",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[var(--ss-shadow-sm)] hover:bg-secondary/80",
        outline:
          "border border-[var(--ss-border-strong)] bg-[var(--ss-surface)] text-foreground shadow-[var(--ss-shadow-sm)] hover:border-[var(--ss-glacier-400)] hover:bg-[var(--ss-glacier-50)]",
        ghost:
          "hover:bg-[var(--ss-glacier-100)] hover:text-[var(--ss-navy-800)]",
        destructive:
          "bg-[var(--ss-danger)] text-destructive-foreground shadow-[var(--ss-shadow-sm)] hover:bg-[var(--ss-danger)]/90",
        glacier:
          "bg-[var(--ss-glacier-500)] text-white shadow-[var(--ss-shadow-sm)] hover:bg-[var(--ss-glacier-400)] hover:shadow-[var(--ss-shadow-md)]",
        link: "text-[var(--ss-glacier-500)] underline-offset-4 hover:text-[var(--ss-navy-800)] hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-[13px]",
        lg: "h-11 rounded-[var(--ss-radius)] px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
