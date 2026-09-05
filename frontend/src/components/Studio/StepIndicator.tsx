import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { STEPS } from "@/hooks/useStudio";

/** Four stages, always visible, so the run never feels open-ended. */
export const StepIndicator: React.FC<{ current: number }> = ({ current }) => (
  <ol className="flex items-center justify-center gap-2 sm:gap-3">
    {STEPS.map((label, index) => {
      const done = index < current;
      const active = index === current;
      return (
        <li key={label} className="flex items-center gap-2 sm:gap-3">
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold transition-colors",
                done
                  ? "bg-brand-500/25 text-brand-300"
                  : active
                    ? "bg-linear-to-br from-brand-500 to-accent-400 text-white"
                    : "border border-white/12 text-mist-400/50",
              )}
            >
              {done ? <Check className="size-3.5" /> : index + 1}
            </span>
            <span
              aria-current={active ? "step" : undefined}
              className={cn(
                "hidden text-xs font-medium sm:block",
                active
                  ? "text-white"
                  : done
                    ? "text-mist-300"
                    : "text-mist-400/50",
              )}
            >
              {label}
            </span>
          </span>
          {index < STEPS.length - 1 ? (
            <span
              className={cn(
                "h-px w-6 sm:w-10",
                done ? "bg-brand-400/40" : "bg-white/10",
              )}
            />
          ) : null}
        </li>
      );
    })}
  </ol>
);
