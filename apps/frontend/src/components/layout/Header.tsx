import { Moon, Sun, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import { useLiveStore } from "@/stores/live";
import { cn } from "@/lib/utils";

export function BackgroundLayers() {
  return (
    <>
      <div className="fixed inset-0 -z-40 bg-background" aria-hidden />
      {/* Dark mode layers */}
      <div
        className="fixed inset-0 -z-30 hidden dark:block"
        style={{
          background: "linear-gradient(168deg, oklch(0.09 0.08 292), oklch(0.11 0.09 288) 42%, oklch(0.06 0.055 305))",
        }}
        aria-hidden
      />
      <div
        className="fixed inset-0 -z-20 hidden dark:block"
        style={{
          background:
            "radial-gradient(ellipse at 80% 10%, oklch(0.48 0.14 303 / 0.38), transparent 50%), radial-gradient(ellipse at 10% 90%, oklch(0.52 0.18 25 / 0.16), transparent 50%), radial-gradient(ellipse at 50% 100%, oklch(0.38 0.14 285 / 0.5), transparent 60%)",
        }}
        aria-hidden
      />
      <div
        className="fixed inset-0 -z-10 hidden dark:block"
        style={{
          background: "linear-gradient(transparent 55%, oklch(0.05 0.07 298 / 0.88))",
        }}
        aria-hidden
      />
      {/* Light mode layers */}
      <div
        className="fixed inset-0 -z-30 dark:hidden"
        style={{
          background: "linear-gradient(168deg, oklch(0.94 0.03 295), oklch(0.96 0.02 295) 50%, oklch(0.91 0.04 288))",
        }}
        aria-hidden
      />
      <div
        className="fixed inset-0 -z-20 dark:hidden"
        style={{
          background:
            "radial-gradient(ellipse at 80% 10%, oklch(0.75 0.08 303 / 0.25), transparent 50%), radial-gradient(ellipse at 10% 90%, oklch(0.78 0.1 25 / 0.12), transparent 50%), radial-gradient(ellipse at 50% 100%, oklch(0.7 0.06 285 / 0.2), transparent 60%)",
        }}
        aria-hidden
      />
    </>
  );
}

export function Header() {
  const { theme, toggle } = useTheme();
  const connected = useLiveStore((s) => s.connected);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/70 backdrop-blur-md shadow-(--shadow-nav)">
      <div className="flex h-14 w-full items-center justify-between px-4 lg:px-12 xl:px-16">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />
          <span className="font-heading text-lg font-bold">MyDNS</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span
              className={cn("size-2 rounded-full", connected ? "bg-green-500 shadow-[0_0_8px_oklch(0.7_0.2_145/0.6)]" : "bg-muted-foreground")}
            />
            {connected ? "Temps réel actif" : "Hors ligne"}
          </div>
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Changer de thème">
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        </div>
      </div>
    </header>
  );
}
