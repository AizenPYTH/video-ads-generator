import { Link, useLocation } from "react-router-dom";
import { Clapperboard, RotateCcw } from "lucide-react";
import { Button } from "@/components/Common/Button";
import { useProjectStore } from "@/store/useProjectStore";

const STEPS = [
  { path: "/create", label: "Capture" },
  { path: "/analysis", label: "Analyse" },
  { path: "/storyboard", label: "Concept" },
  { path: "/generate", label: "Render" },
  { path: "/download", label: "Download" },
] as const;

export const Header: React.FC = () => {
  const location = useLocation();
  const reset = useProjectStore((state) => state.reset);
  const activeIndex = STEPS.findIndex((step) =>
    location.pathname.startsWith(step.path),
  );

  return (
    <header className="sticky top-0 z-40 border-b border-white/6 bg-ink-950/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-linear-to-br from-brand-500 to-accent-400 text-white">
            <Clapperboard className="size-4" />
          </span>
          <span className="text-[15px] font-bold tracking-tight text-white">
            Reel
          </span>
        </Link>

        {activeIndex >= 0 ? (
          <nav aria-label="Progress" className="hidden flex-1 md:block">
            <ol className="flex items-center gap-1.5">
              {STEPS.map((step, index) => {
                const state =
                  index < activeIndex
                    ? "done"
                    : index === activeIndex
                      ? "current"
                      : "todo";
                return (
                  <li key={step.path} className="flex items-center gap-1.5">
                    <span
                      aria-current={state === "current" ? "step" : undefined}
                      className={
                        "rounded-full px-2.5 py-1 text-xs font-medium transition-colors " +
                        (state === "current"
                          ? "bg-brand-500/18 text-brand-400"
                          : state === "done"
                            ? "text-mist-300"
                            : "text-mist-400/50")
                      }
                    >
                      {step.label}
                    </span>
                    {index < STEPS.length - 1 ? (
                      <span className="h-px w-4 bg-white/10" />
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </nav>
        ) : (
          <div className="flex-1" />
        )}

        {activeIndex >= 0 ? (
          <Button variant="ghost" size="sm" onClick={reset} asChild>
            <Link to="/create">
              <RotateCcw />
              Start over
            </Link>
          </Button>
        ) : (
          <Button size="sm" asChild>
            <Link to="/create">Create an ad</Link>
          </Button>
        )}
      </div>
    </header>
  );
};
