import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Download, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardOverlay } from "@/components/ui/card";
import { ActionBadge } from "@/components/queries/ActionBadge";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export function QueriesPage() {
  const [page, setPage] = useState(1);
  const [domain, setDomain] = useState("");
  const [action, setAction] = useState("");
  const [search, setSearch] = useState("");
  const parentRef = useRef<HTMLDivElement>(null);

  const { data, refetch } = useQuery({
    queryKey: ["queries", page, domain, action],
    queryFn: () => api.queries({ page, limit: 50, domain: domain || undefined, action: action || undefined }),
    refetchInterval: 10000,
  });

  const virtualizer = useVirtualizer({
    count: data?.items.length ?? 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 10,
  });

  const handleSearch = () => {
    setDomain(search);
    setPage(1);
  };

  const handlePurge = async () => {
    if (!confirm("Supprimer tous les logs ?")) return;
    await api.deleteQueries();
    void refetch();
  };

  const handleExport = async () => {
    await api.exportQueries({ action: action || undefined, domain: domain || undefined });
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">Requêtes DNS</h1>
          <p className="text-muted-foreground">{data?.total ?? 0} requêtes enregistrées</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void handleExport()}>
            <Download className="size-4" /> Exporter CSV
          </Button>
          <Button variant="destructive" size="sm" onClick={() => void handlePurge()}>
            <Trash2 className="size-4" /> Purger les logs
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex gap-2">
          <Input placeholder="Filtrer par domaine…" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} className="w-64" />
          <Button variant="outline" onClick={handleSearch}><Search className="size-4" /></Button>
        </div>
        <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} className="h-9 rounded-md border border-input bg-background/60 px-3 text-sm">
          <option value="">Toutes les actions</option>
          <option value="allowed">Autorisées</option>
          <option value="blocked">Bloquées</option>
          <option value="cached">Cache</option>
        </select>
      </div>

      <Card className="relative">
        <CardOverlay />
        <CardHeader><CardTitle>Historique</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-[1fr_2fr_1fr_1fr_80px] gap-2 border-b border-border pb-2 text-xs text-muted-foreground">
            <span>Horodatage</span>
            <span>Domaine</span>
            <span>Client</span>
            <span>Action</span>
            <span>Temps</span>
          </div>
          <div ref={parentRef} className="max-h-[520px] overflow-auto">
            <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
              {virtualizer.getVirtualItems().map((row) => {
                const q = data!.items[row.index]!;
                return (
                  <div
                    key={q._id}
                    className="absolute left-0 grid w-full grid-cols-[1fr_2fr_1fr_1fr_80px] gap-2 border-b border-border/30 py-2 text-sm"
                    style={{ transform: `translateY(${row.start}px)` }}
                  >
                    <span className="truncate text-muted-foreground">{formatDate(q.timestamp)}</span>
                    <span className="truncate font-mono">{q.domain}</span>
                    <span className="truncate">{q.clientIp}</span>
                    <span><ActionBadge action={q.action} /></span>
                    <span>{q.responseTimeMs} ms</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Précédent</Button>
            <span className="text-sm text-muted-foreground">Page {page} / {data?.totalPages ?? 1}</span>
            <Button variant="outline" size="sm" disabled={page >= (data?.totalPages ?? 1)} onClick={() => setPage((p) => p + 1)}>Suivant</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
