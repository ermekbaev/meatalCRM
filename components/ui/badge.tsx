import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "outline";
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium",
        variant === "default"   && "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
        variant === "secondary" && "bg-slate-50 text-slate-500 ring-1 ring-slate-200",
        variant === "outline"   && "border border-slate-200 text-slate-600",
        className
      )}
      {...props}
    />
  )
);
Badge.displayName = "Badge";

export { Badge };
