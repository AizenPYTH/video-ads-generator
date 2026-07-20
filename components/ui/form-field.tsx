import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: React.ReactNode;
  htmlFor?: string;
  description?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
}

function FormField({
  label,
  htmlFor,
  description,
  error,
  required,
  children,
  className,
  ...props
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {label && (
        <Label htmlFor={htmlFor} className="text-foreground">
          {label}
          {required && (
            <span className="ml-1 text-destructive" aria-hidden="true">
              *
            </span>
          )}
        </Label>
      )}
      {children}
      {error ? (
        <p className="text-xs leading-relaxed text-destructive" role="alert">
          {error}
        </p>
      ) : (
        description && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        )
      )}
    </div>
  );
}

export { FormField, type FormFieldProps };
