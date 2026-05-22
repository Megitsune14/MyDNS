import * as React from "react";
import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "bg-card/85 text-card-foreground flex flex-col gap-6 rounded-xl border border-border backdrop-blur-md overflow-hidden shadow-(--shadow-card)",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1.5 px-6 pt-6 relative z-10", className)} {...props} />;
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("font-heading text-xl leading-none font-bold", className)} {...props} />;
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("text-muted-foreground text-sm", className)} {...props} />;
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("px-6 pb-6 relative z-10", className)} {...props} />;
}

function CardOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/8 via-transparent to-accent/10"
      aria-hidden
    />
  );
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardOverlay };
