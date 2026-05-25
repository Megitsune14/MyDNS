import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  List,
  BarChart3,
  Shield,
  Scale,
  Monitor,
  Settings,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/requetes", label: "Requêtes DNS", icon: List },
  { to: "/statistiques", label: "Statistiques", icon: BarChart3 },
  { to: "/listes", label: "Listes de blocage", icon: Shield },
  { to: "/regles", label: "Règles", icon: Scale },
  { to: "/appareils", label: "Appareils", icon: Monitor },
  { to: "/parametres", label: "Paramètres", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="sticky top-14 flex h-[calc(100vh-3.5rem)] w-full shrink-0 self-stretch border-r border-sidebar-border bg-sidebar/80 backdrop-blur-md lg:w-64">
      <div className="flex h-full w-full flex-col gap-1 p-4">
        <div className="mb-4 flex shrink-0 items-center gap-2 px-3 py-2">
          <Flame className="size-5 text-primary" />
          <span className="font-heading text-sm font-bold text-sidebar-foreground">Navigation</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary font-medium shadow-[0_0_16px_oklch(0.58_0.2_27/0.15)]"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}
