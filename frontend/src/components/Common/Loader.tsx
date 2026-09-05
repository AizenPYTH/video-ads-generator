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

export const Loader: React.FC<{ message: string; detail?: string }> = ({
  message,
  detail,
}) => (
  <div
    role="status"
    aria-live="polite"
    className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center"
  >
    <div className="relative size-14">
      <span className="absolute inset-0 animate-ping rounded-full bg-brand-500/20" />
      <span className="absolute inset-2 rounded-full bg-linear-to-br from-brand-400 to-accent-400" />
    </div>
    <div>
      <p className="text-base font-semibold text-white">{message}</p>
      {detail ? <p className="mt-1 text-sm text-mist-400">{detail}</p> : null}
    </div>
  </div>
);

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div
    className={cn(
      "shimmer relative overflow-hidden rounded-lg bg-white/5",
      className,
    )}
  />
);
