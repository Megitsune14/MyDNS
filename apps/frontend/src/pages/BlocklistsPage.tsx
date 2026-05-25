import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardOverlay } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/utils";

export function BlocklistsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  const { data: sources } = useQuery({ queryKey: ["blocklist-sources"], queryFn: api.blocklistSources });
  const { data: status } = useQuery({ queryKey: ["blocklist-status"], queryFn: api.blocklistStatus, refetchInterval: 5000 });

  const syncAll = useMutation({
    mutationFn: api.syncBlocklists,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["blocklist-sources"] });
      void qc.invalidateQueries({ queryKey: ["blocklist-status"] });
    },
  });

  const createSource = useMutation({
    mutationFn: () => api.createBlocklistSource({ name, url, enabled: true, format: "domains", schedule: "daily" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["blocklist-sources"] });
      setShowForm(false);
      setName("");
      setUrl("");
    },
  });

  const toggleSource = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => api.updateBlocklistSource(id, { enabled }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["blocklist-sources"] }),
  });

  const deleteSource = useMutation({
    mutationFn: (id: string) => api.deleteBlocklistSource(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["blocklist-sources"] }),
  });

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">Listes de blocage</h1>
          <p className="text-muted-foreground">
            {formatNumber(status?.entryCount ?? 0)} entrées · Dernière sync : {status?.lastSyncAt ? formatDate(status.lastSyncAt) : "Jamais"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowForm(!showForm)}><Plus className="size-4" /> Ajouter</Button>
          <Button onClick={() => syncAll.mutate()} disabled={syncAll.isPending || status?.syncing}>
            <RefreshCw className={`size-4 ${syncAll.isPending ? "animate-spin" : ""}`} />
            {syncAll.isPending ? "Synchronisation…" : "Synchroniser tout"}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="relative">
          <CardOverlay />
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ma liste" />
              </div>
              <div className="space-y-2">
                <Label>URL</Label>
                <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
              </div>
            </div>
            <Button className="mt-4" onClick={() => createSource.mutate()} disabled={!name || !url}>Créer</Button>
          </CardContent>
        </Card>
      )}

      <Card className="relative">
        <CardOverlay />
        <CardHeader><CardTitle>Sources</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {sources?.map((s) => (
            <div key={s._id} className="flex flex-wrap items-center justify-between gap-4 border-b border-border/30 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{s.name}</span>
                  <Badge variant={s.lastSyncStatus === "ok" ? "allowed" : s.lastSyncStatus === "error" ? "blocked" : "secondary"}>
                    {s.lastSyncStatus}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground font-mono truncate max-w-lg">{s.url}</p>
                <p className="text-xs text-muted-foreground">{formatNumber(s.entryCount)} entrées · {s.format}</p>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={s.enabled} onCheckedChange={(v) => toggleSource.mutate({ id: s._id, enabled: v })} />
                <Button variant="ghost" size="icon" onClick={() => deleteSource.mutate(s._id)}><Trash2 className="size-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
