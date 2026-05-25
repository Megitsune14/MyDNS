import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-primary/40 bg-primary/15 text-primary shadow-[0_0_12px_oklch(0.58_0.2_27/0.25)]",
        secondary: "border-border bg-secondary text-secondary-foreground",
        outline: "border-accent/40 text-foreground",
        blocked: "border-destructive/40 bg-destructive/15 text-destructive",
        allowed: "border-accent/40 bg-accent/15 text-accent-foreground",
        cached: "border-chart-3/40 bg-chart-3/15 text-chart-3",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
