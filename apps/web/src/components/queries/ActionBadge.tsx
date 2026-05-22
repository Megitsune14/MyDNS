import type { QueryAction } from "@mydns/shared";
import { Badge } from "@/components/ui/badge";

const labels: Record<QueryAction, string> = {
  allowed: "Autorisé",
  blocked: "Bloqué",
  cached: "Cache",
};

const variants: Record<QueryAction, "allowed" | "blocked" | "cached"> = {
  allowed: "allowed",
  blocked: "blocked",
  cached: "cached",
};

export function ActionBadge({ action }: { action: QueryAction }) {
  return <Badge variant={variants[action]}>{labels[action]}</Badge>;
}
