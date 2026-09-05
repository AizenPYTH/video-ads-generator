import { cva } from "class-variance-authority";

/**
 * Kept out of `Button.tsx` so that module only exports components - React Fast
 * Refresh cannot preserve state across edits to a file that also exports
 * values.
 */
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-brand-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-linear-to-b from-brand-500 to-brand-600 text-white shadow-[0_10px_30px_-10px_rgba(79,70,229,0.9)] hover:from-brand-400 hover:to-brand-500 active:translate-y-px",
        secondary:
          "border border-white/10 bg-white/5 text-mist-200 hover:border-white/20 hover:bg-white/10",
        ghost: "text-mist-300 hover:bg-white/6 hover:text-white",
        danger:
          "border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20",
      },
      size: {
        sm: "h-9 px-3.5",
        md: "h-11 px-5",
        lg: "h-13 px-7 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);
