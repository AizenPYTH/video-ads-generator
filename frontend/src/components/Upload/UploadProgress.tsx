import { Check, Loader2 } from "lucide-react";
import type { UploadStage } from "@/hooks/useUpload";

const STEPS: Array<{ id: UploadStage; label: string }> = [
  { id: "reading", label: "Reading your files" },
  { id: "capturing", label: "Capturing the product" },
  { id: "done", label: "Ready" },
];

export const UploadProgress: React.FC<{ stage: UploadStage }> = ({ stage }) => {
  if (stage === "idle") return null;
  const activeIndex = STEPS.findIndex((step) => step.id === stage);

  return (
    <ul className="space-y-2.5" aria-live="polite">
      {STEPS.map((step, index) => {
        const done = index < activeIndex || stage === "done";
        const active = index === activeIndex && stage !== "done";
        return (
          <li
            key={step.id}
            className={
              "flex items-center gap-2.5 text-sm " +
              (done ? "text-mist-300" : active ? "text-white" : "text-mist-400/50")
            }
          >
            {done ? (
              <Check className="size-4 text-emerald-400" />
            ) : active ? (
              <Loader2 className="size-4 animate-spin text-brand-400" />
            ) : (
              <span className="size-4 rounded-full border border-white/15" />
            )}
            {step.label}
          </li>
        );
      })}
    </ul>
  );
};
