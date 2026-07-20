import * as React from "react";
import { cn } from "@/lib/utils";

interface ResponsiveTableProps extends React.HTMLAttributes<HTMLDivElement> {
  mobileContent?: React.ReactNode;
  tableClassName?: string;
}

function ResponsiveTable({
  children,
  mobileContent,
  className,
  tableClassName,
  ...props
}: ResponsiveTableProps) {
  return (
    <div className={cn("w-full", className)} {...props}>
      {mobileContent && <div className="sm:hidden">{mobileContent}</div>}
      <div
        className={cn(
          "w-full overflow-x-auto rounded-xl border border-border/80 bg-card shadow-xs",
          mobileContent && "hidden sm:block",
          tableClassName
        )}
        tabIndex={0}
        role="region"
        aria-label="Tableau défilant horizontalement"
      >
        {children}
      </div>
    </div>
  );
}

export { ResponsiveTable, type ResponsiveTableProps };
