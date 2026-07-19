import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-pitch focus:ring-offset-2 focus:ring-offset-midnight",
  {
    variants: {
      variant: {
        default: "bg-pitch text-midnight",
        secondary: "bg-elevated text-secondary border-border",
        live: "bg-pitch text-midnight animate-pulse-live",
        danger: "bg-danger text-white",
        warning: "bg-warning text-midnight",
        info: "bg-info text-midnight",
        outline: "border-border text-secondary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
