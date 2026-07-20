import * as React from "react";
import { LoaderCircle } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

interface LoadingButtonProps extends Omit<ButtonProps, "asChild"> {
  loading?: boolean;
  loadingText?: React.ReactNode;
}

const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ loading = false, loadingText, children, disabled, ...props }, ref) => (
    <Button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
      )}
      {loading && loadingText ? loadingText : children}
    </Button>
  )
);

LoadingButton.displayName = "LoadingButton";

export { LoadingButton, type LoadingButtonProps };
