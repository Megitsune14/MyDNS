import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardOverlay } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

export function StatsPage() {
  const [period, setPeriod] = useState<"24h" | "7d">("24h");

  const { data: timeline } = useQuery({
    queryKey: ["stats-timeline", period],
    queryFn: () => api.statsTimeline(period),
    refetchInterval: 60000,
  });
  const { data: topDomains } = useQuery({ queryKey: ["top-domains"], queryFn: () => api.topDomains(15) });
  const { data: topClients } = useQuery({ queryKey: ["top-clients"], queryFn: () => api.topClients(15) });

  const chartData = timeline?.map((t) => ({
    label: new Date(t.hour).toLocaleString("fr-FR", period === "7d" ? { day: "2-digit", hour: "2-digit" } : { hour: "2-digit", minute: "2-digit" }),
    total: t.total,
    blocked: t.blocked,
  })) ?? [];

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Statistiques</h1>
        <p className="text-muted-foreground">Analyse du trafic DNS filtré</p>
      </div>

      <Tabs value={period} onValueChange={(v) => setPeriod(v as "24h" | "7d")}>
        <TabsList>
          <TabsTrigger value="24h">24 heures</TabsTrigger>
          <TabsTrigger value="7d">7 jours</TabsTrigger>
        </TabsList>
        <TabsContent value={period}>
          <Card className="relative">
            <CardOverlay />
            <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.72 0.1 78 / 0.15)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="oklch(0.58 0.2 27 / 0.7)" name="Total" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="blocked" fill="oklch(0.72 0.1 78 / 0.7)" name="Bloquées" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="relative">
          <CardOverlay />
          <CardHeader><CardTitle>Top domaines</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {topDomains?.map((d, i) => (
              <div key={d.domain} className="flex items-center gap-3 text-sm">
                <span className="w-6 text-muted-foreground">{i + 1}</span>
                <span className="flex-1 truncate font-mono">{d.domain}</span>
                <span className="text-muted-foreground">{formatNumber(d.count)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="relative">
          <CardOverlay />
          <CardHeader><CardTitle>Top clients</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {topClients?.map((c, i) => (
              <div key={c.ip} className="flex items-center gap-3 text-sm">
                <span className="w-6 text-muted-foreground">{i + 1}</span>
                <span className="flex-1">{c.alias ?? c.ip}</span>
                <span className="text-muted-foreground">{formatNumber(c.count)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
