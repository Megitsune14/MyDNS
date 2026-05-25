import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardOverlay } from "@/components/ui/card";
import { api } from "@/lib/api";

function detectPatternType(pattern: string, selected: "exact" | "wildcard" | "regex"): "exact" | "wildcard" | "regex" {
  if (selected !== "exact") return selected;
  if (pattern.startsWith("*.") || pattern.startsWith("/")) return pattern.startsWith("/") ? "regex" : "wildcard";
  return "exact";
}

export function RulesPage() {
  const qc = useQueryClient();
  const [pattern, setPattern] = useState("");
  const [comment, setComment] = useState("");
  const [type, setType] = useState<"allow" | "deny">("deny");
  const [patternType, setPatternType] = useState<"exact" | "wildcard" | "regex">("exact");

  const { data: allowRules } = useQuery({ queryKey: ["rules", "allow"], queryFn: () => api.rules("allow") });
  const { data: denyRules } = useQuery({ queryKey: ["rules", "deny"], queryFn: () => api.rules("deny") });

  const createRule = useMutation({
    mutationFn: () =>
      api.createRule({
        type,
        pattern,
        patternType: detectPatternType(pattern, patternType),
        comment: comment || null,
        enabled: true,
        priority: 0,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["rules"] });
      setPattern("");
      setComment("");
    },
  });

  const deleteRule = useMutation({
    mutationFn: (id: string) => api.deleteRule(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["rules"] }),
  });

  const RuleList = ({ rules, emptyLabel }: { rules: typeof allowRules; emptyLabel: string }) => (
    <div className="space-y-2">
      {!rules?.length && <p className="text-muted-foreground text-sm">{emptyLabel}</p>}
      {rules?.map((r) => (
        <div key={r._id} className="flex items-center justify-between border-b border-border/30 py-2">
          <div>
            <span className="font-mono text-sm">{r.pattern}</span>
            {r.comment && <p className="text-xs text-muted-foreground">{r.comment}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{r.patternType}</Badge>
            <Button variant="ghost" size="icon" onClick={() => deleteRule.mutate(r._id)}><Trash2 className="size-4 text-destructive" /></Button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Règles</h1>
        <p className="text-muted-foreground">Whitelist et blacklist manuelles</p>
      </div>

      <Card className="relative">
        <CardOverlay />
        <CardHeader><CardTitle>Ajouter une règle</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <select value={type} onChange={(e) => setType(e.target.value as "allow" | "deny")} className="h-9 w-full rounded-md border border-input bg-background/60 px-3 text-sm">
                <option value="deny">Bloquer</option>
                <option value="allow">Autoriser</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Format</Label>
              <select value={patternType} onChange={(e) => setPatternType(e.target.value as "exact" | "wildcard" | "regex")} className="h-9 w-full rounded-md border border-input bg-background/60 px-3 text-sm">
                <option value="exact">Exact</option>
                <option value="wildcard">Wildcard (*.example.com)</option>
                <option value="regex">Regex</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Domaine / motif</Label>
              <Input value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="ads.example.com ou /^ads\\./" />
            </div>
            <div className="space-y-2">
              <Label>Commentaire</Label>
              <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optionnel" />
            </div>
          </div>
          <Button className="mt-4" onClick={() => createRule.mutate()} disabled={!pattern}>
            <Plus className="size-4" /> Ajouter
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="deny">
        <TabsList>
          <TabsTrigger value="deny">Blacklist ({denyRules?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="allow">Whitelist ({allowRules?.length ?? 0})</TabsTrigger>
        </TabsList>
        <TabsContent value="deny">
          <Card className="relative"><CardOverlay /><CardContent className="pt-6"><RuleList rules={denyRules} emptyLabel="Aucune règle de blocage" /></CardContent></Card>
        </TabsContent>
        <TabsContent value="allow">
          <Card className="relative"><CardOverlay /><CardContent className="pt-6"><RuleList rules={allowRules} emptyLabel="Aucune règle d'autorisation" /></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
