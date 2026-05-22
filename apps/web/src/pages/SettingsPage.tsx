import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardOverlay } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { formatBytes, formatUptime } from "@/lib/utils";

export function SettingsPage() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: api.settings });
  const { data: system } = useQuery({ queryKey: ["system-info"], queryFn: api.systemInfo, refetchInterval: 30000 });

  const [upstreams, setUpstreams] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    if (settings) setUpstreams(settings.upstreams.join(", "));
  }, [settings]);

  const updateSettings = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.updateSettings(data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["settings"] }),
  });

  const changePassword = useMutation({
    mutationFn: () => api.changePassword(currentPassword, newPassword),
    onSuccess: () => { setCurrentPassword(""); setNewPassword(""); alert("Mot de passe mis à jour"); },
  });

  const flushCache = useMutation({ mutationFn: api.flushCache });

  const handleSave = () => {
    updateSettings.mutate({
      upstreams: upstreams.split(",").map((s) => s.trim()).filter(Boolean),
      logBlockedOnly: settings?.logBlockedOnly,
      logRetentionDays: settings?.logRetentionDays,
      cacheMaxEntries: settings?.cacheMaxEntries,
      rateLimitPerIp: settings?.rateLimitPerIp,
      blockResponse: settings?.blockResponse,
    });
  };

  if (!settings) return null;

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground">Configuration du serveur DNS</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="relative">
          <CardOverlay />
          <CardHeader><CardTitle>DNS</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Serveurs upstream (séparés par virgule)</Label>
              <Input value={upstreams} onChange={(e) => setUpstreams(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Réponse de blocage</Label>
              <select
                value={settings.blockResponse}
                onChange={(e) => updateSettings.mutate({ blockResponse: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background/60 px-3 text-sm"
              >
                <option value="null_ip">0.0.0.0 (null IP)</option>
                <option value="nxdomain">NXDOMAIN</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Logger uniquement les bloquées</Label>
              <Switch checked={settings.logBlockedOnly} onCheckedChange={(v) => updateSettings.mutate({ logBlockedOnly: v })} />
            </div>
            <div className="space-y-2">
              <Label>Rétention des logs (jours)</Label>
              <Input type="number" value={settings.logRetentionDays} onChange={(e) => updateSettings.mutate({ logRetentionDays: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Rate limit (req/s par IP)</Label>
              <Input type="number" value={settings.rateLimitPerIp} onChange={(e) => updateSettings.mutate({ rateLimitPerIp: Number(e.target.value) })} />
            </div>
            <Button onClick={handleSave}>Sauvegarder</Button>
          </CardContent>
        </Card>

        <Card className="relative">
          <CardOverlay />
          <CardHeader><CardTitle>Système</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Version</span><span>{system?.version ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Uptime</span><span>{system ? formatUptime(system.uptime) : "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Mémoire RSS</span><span>{system ? formatBytes(system.memoryUsage.rss) : "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Cache DNS</span><span>{system ? `${system.cache.size} / ${system.cache.maxEntries}` : "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Requêtes totales</span><span>{system?.dns.queriesTotal ?? "—"}</span></div>
            <Separator />
            <Button variant="outline" onClick={() => flushCache.mutate()} disabled={flushCache.isPending}>
              <RefreshCw className="size-4" /> Vider le cache DNS
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="relative">
        <CardOverlay />
        <CardHeader><CardTitle>Sécurité</CardTitle></CardHeader>
        <CardContent className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label>Mot de passe actuel</Label>
            <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Nouveau mot de passe</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <Button onClick={() => changePassword.mutate()} disabled={!currentPassword || newPassword.length < 8}>
            Changer le mot de passe
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
