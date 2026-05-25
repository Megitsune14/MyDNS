import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardOverlay } from "@/components/ui/card";
import { ActionBadge } from "@/components/queries/ActionBadge";
import { api } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/utils";

export function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [page, setPage] = useState(1);

  const { data: device } = useQuery({
    queryKey: ["device", id],
    queryFn: () => api.getDevice(id!),
    enabled: !!id,
  });

  const { data: queries } = useQuery({
    queryKey: ["device-queries", id, page],
    queryFn: () => api.deviceQueries(id!, page, 50),
    enabled: !!id,
    refetchInterval: 15000,
  });

  if (!device) return <p className="text-muted-foreground">Chargement…</p>;

  const blockedPercent = device.queryCount === 0 ? 0 : Math.round((device.blockedCount / device.queryCount) * 100);

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/appareils"><ArrowLeft className="size-4" /></Link>
        </Button>
        <div>
          <h1 className="font-heading text-3xl font-bold">{device.alias ?? device.ip}</h1>
          <p className="font-mono text-sm text-muted-foreground">{device.ip}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="relative"><CardOverlay /><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Requêtes</p><p className="font-heading text-2xl font-bold">{formatNumber(device.queryCount)}</p></CardContent></Card>
        <Card className="relative"><CardOverlay /><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Bloquées</p><p className="font-heading text-2xl font-bold">{formatNumber(device.blockedCount)}</p></CardContent></Card>
        <Card className="relative"><CardOverlay /><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Taux blocage</p><p className="font-heading text-2xl font-bold">{blockedPercent} %</p></CardContent></Card>
      </div>

      <Card className="relative">
        <CardOverlay />
        <CardHeader>
          <CardTitle>Requêtes récentes</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 pr-4">Horodatage</th>
                <th className="pb-2 pr-4">Domaine</th>
                <th className="pb-2 pr-4">Action</th>
                <th className="pb-2">Temps</th>
              </tr>
            </thead>
            <tbody>
              {queries?.items.map((q) => (
                <tr key={q._id} className="border-b border-border/30">
                  <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground">{formatDate(q.timestamp)}</td>
                  <td className="py-2 pr-4 font-mono">{q.domain}</td>
                  <td className="py-2 pr-4"><ActionBadge action={q.action} /></td>
                  <td className="py-2">{q.responseTimeMs} ms</td>
                </tr>
              )) ?? (
                <tr><td colSpan={4} className="py-4 text-muted-foreground">Aucune requête</td></tr>
              )}
            </tbody>
          </table>
          <div className="mt-4 flex items-center justify-between">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Précédent</Button>
            <span className="text-sm text-muted-foreground">Page {page} / {queries?.totalPages ?? 1}</span>
            <Button variant="outline" size="sm" disabled={page >= (queries?.totalPages ?? 1)} onClick={() => setPage((p) => p + 1)}>Suivant</Button>
          </div>
        </CardContent>
      </Card>

      {device.tags.length > 0 && (
        <div className="flex gap-2">
          {device.tags.map((tag) => (
            <Badge key={tag} variant="outline">{tag}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}
