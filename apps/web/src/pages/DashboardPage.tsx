import { useQuery } from "@tanstack/react-query";
import { Activity, Ban, HardDrive, Users } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { StatCard } from "@/components/dashboard/StatCard";
import { QueryFeed } from "@/components/dashboard/QueryFeed";
import { Card, CardContent, CardHeader, CardTitle, CardOverlay } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

export function DashboardPage() {
  const { data: overview } = useQuery({ queryKey: ["stats-overview"], queryFn: api.statsOverview, refetchInterval: 30000 });
  const { data: timeline } = useQuery({ queryKey: ["stats-timeline"], queryFn: () => api.statsTimeline("24h"), refetchInterval: 60000 });
  const { data: topBlocked } = useQuery({ queryKey: ["top-blocked"], queryFn: () => api.topBlocked(10), refetchInterval: 60000 });

  const chartData = timeline?.map((t) => ({
    hour: new Date(t.hour).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    total: t.total,
    blocked: t.blocked,
  })) ?? [];

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Tableau de bord</h1>
        <p className="text-muted-foreground">Vue d'ensemble du filtrage DNS</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Requêtes (24h)" value={overview?.totalQueries24h ?? 0} icon={Activity} />
        <StatCard title="Bloquées (24h)" value={overview?.blockedQueries24h ?? 0} description={`${overview?.blockedPercent ?? 0} % du trafic`} icon={Ban} />
        <StatCard title="Clients actifs" value={overview?.activeClients24h ?? 0} icon={Users} />
        <StatCard title="Entrées blocklist" value={overview?.blocklistEntries ?? 0} description={`Cache: ${overview?.cacheHitRate ?? 0} %`} icon={HardDrive} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="relative">
          <CardOverlay />
          <CardHeader>
            <CardTitle>Activité DNS (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.72 0.1 78 / 0.15)" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="total" stackId="1" stroke="oklch(0.58 0.2 27)" fill="oklch(0.58 0.2 27 / 0.3)" name="Total" />
                <Area type="monotone" dataKey="blocked" stackId="2" stroke="oklch(0.72 0.1 78)" fill="oklch(0.72 0.1 78 / 0.3)" name="Bloquées" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <QueryFeed />
      </div>

      <Card className="relative">
        <CardOverlay />
        <CardHeader>
          <CardTitle>Top domaines bloqués</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {topBlocked?.map((item) => (
              <div key={item.domain} className="flex items-center justify-between border-b border-border/30 py-2 text-sm">
                <span className="truncate font-mono">{item.domain}</span>
                <span className="text-muted-foreground">{formatNumber(item.count)}</span>
              </div>
            )) ?? <p className="text-muted-foreground">Aucune donnée</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
