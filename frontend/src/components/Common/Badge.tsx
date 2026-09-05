import * as React from "react";
import { cn } from "@/lib/utils";

export const Badge: React.FC<
  React.HTMLAttributes<HTMLSpanElement> & { tone?: "default" | "accent" | "muted" }
> = ({ className, tone = "default", ...props }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase",
      tone === "default" && "bg-brand-500/15 text-brand-400 ring-1 ring-brand-500/25",
      tone === "accent" && "bg-accent-400/12 text-accent-300 ring-1 ring-accent-400/25",
      tone === "muted" && "bg-white/5 text-mist-400 ring-1 ring-white/10",
      className,
    )}
    {...props}
  />
);
