import { useLiveStore } from "@/stores/live";
import { Card, CardContent, CardHeader, CardTitle, CardOverlay } from "@/components/ui/card";
import { ActionBadge } from "@/components/queries/ActionBadge";
import { formatDate } from "@/lib/utils";

export function QueryFeed() {
  const queries = useLiveStore((s) => s.queries);

  return (
    <Card className="relative">
      <CardOverlay />
      <CardHeader>
        <CardTitle>Flux en direct</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-80 space-y-2 overflow-y-auto font-mono text-xs">
          {queries.length === 0 && (
            <p className="text-muted-foreground">En attente de requêtes DNS…</p>
          )}
          {queries.map((q, i) => (
            <div key={`${q.timestamp}-${i}`} className="flex items-center gap-2 border-b border-border/30 py-1.5">
              <span className="shrink-0 text-muted-foreground">{formatDate(q.timestamp)}</span>
              <ActionBadge action={q.action} />
              <span className="truncate text-foreground">{q.domain}</span>
              <span className="ml-auto shrink-0 text-muted-foreground">{q.clientIp}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
