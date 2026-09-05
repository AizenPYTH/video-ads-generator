import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";

export const ErrorState: React.FC<{
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}> = ({ title = "Something went wrong", message, onRetry, retryLabel = "Try again" }) => (
  <div
    role="alert"
    className="panel flex flex-col items-start gap-4 rounded-2xl border-red-500/20 bg-red-500/5 p-6"
  >
    <div className="flex items-center gap-3">
      <span className="grid size-9 place-items-center rounded-xl bg-red-500/15 text-red-300">
        <AlertTriangle className="size-4" />
      </span>
      <div>
        <p className="font-semibold text-white">{title}</p>
        <p className="mt-0.5 text-sm text-mist-400">{message}</p>
      </div>
    </div>
    {onRetry ? (
      <Button variant="secondary" size="sm" onClick={onRetry}>
        {retryLabel}
      </Button>
    ) : null}
  </div>
);
