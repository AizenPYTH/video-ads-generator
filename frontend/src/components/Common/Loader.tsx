import { cn } from "@/lib/utils";

export const Spinner: React.FC<{ className?: string }> = ({ className }) => (
  <span
    aria-hidden
    className={cn(
      "inline-block size-4 animate-spin rounded-full border-2 border-white/25 border-t-white",
      className,
    )}
  />
);
