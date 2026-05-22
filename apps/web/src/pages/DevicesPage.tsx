import { Link } from "react-router-dom";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardOverlay } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/utils";

export function DevicesPage() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [alias, setAlias] = useState("");

  const { data: devices } = useQuery({ queryKey: ["devices"], queryFn: api.devices, refetchInterval: 30000 });

  const updateDevice = useMutation({
    mutationFn: ({ id, alias }: { id: string; alias: string }) => api.updateDevice(id, { alias }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["devices"] });
      setEditingId(null);
    },
  });

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Appareils</h1>
        <p className="text-muted-foreground">{devices?.length ?? 0} appareils détectés sur le réseau</p>
      </div>

      <Card className="relative">
        <CardOverlay />
        <CardHeader><CardTitle>Clients DNS</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 pr-4">IP</th>
                <th className="pb-2 pr-4">Alias</th>
                <th className="pb-2 pr-4">Requêtes</th>
                <th className="pb-2 pr-4">Bloquées</th>
                <th className="pb-2 pr-4">Dernière activité</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {devices?.map((d) => (
                <tr key={d._id} className="border-b border-border/30">
                  <td className="py-2 pr-4 font-mono">{d.ip}</td>
                  <td className="py-2 pr-4">
                    {editingId === d._id ? (
                      <Input value={alias} onChange={(e) => setAlias(e.target.value)} className="h-8 w-40" />
                    ) : (
                      d.alias ?? <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-2 pr-4">{formatNumber(d.queryCount)}</td>
                  <td className="py-2 pr-4"><Badge variant="blocked">{formatNumber(d.blockedCount)}</Badge></td>
                  <td className="py-2 pr-4 text-muted-foreground">{formatDate(d.lastSeen)}</td>
                  <td className="py-2">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={`/appareils/${d._id}`}><Eye className="size-4" /></Link>
                      </Button>
                      {editingId === d._id ? (
                        <Button size="sm" onClick={() => updateDevice.mutate({ id: d._id, alias })}>Sauver</Button>
                      ) : (
                        <Button variant="ghost" size="icon" onClick={() => { setEditingId(d._id); setAlias(d.alias ?? ""); }}>
                          <Pencil className="size-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
