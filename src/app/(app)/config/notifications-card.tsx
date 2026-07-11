"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { saveNotifications } from "../actions";

interface Prefs {
  notificationEmail: string;
  notifyNewLead: boolean;
  notifyHandoff: boolean;
  notifyDailySummary: boolean;
}

const TOGGLES: { key: keyof Prefs; label: string }[] = [
  { key: "notifyNewLead", label: "Avisar quando um lead novo chegar" },
  { key: "notifyHandoff", label: "Avisar quando a IA encaminhar pra mim" },
  { key: "notifyDailySummary", label: "Resumo diário por e-mail" },
];

export function NotificationsCard(initial: Prefs) {
  const [prefs, setPrefs] = useState<Prefs>(initial);
  const [pending, start] = useTransition();

  function save() {
    const fd = new FormData();
    fd.set("notificationEmail", prefs.notificationEmail);
    if (prefs.notifyNewLead) fd.set("notifyNewLead", "on");
    if (prefs.notifyHandoff) fd.set("notifyHandoff", "on");
    if (prefs.notifyDailySummary) fd.set("notifyDailySummary", "on");
    start(async () => {
      await saveNotifications(fd);
      toast.success("Notificações salvas!");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Notificações</CardTitle>
        <p className="text-xs text-muted-foreground">
          E-mail que recebe os avisos e o resumo.
        </p>
      </CardHeader>
      <CardContent className="space-y-1">
        <Input
          type="email"
          value={prefs.notificationEmail}
          onChange={(e) =>
            setPrefs((p) => ({ ...p, notificationEmail: e.target.value }))
          }
          placeholder="seu@email.com"
          className="mb-2"
        />

        {TOGGLES.map((tg, i) => (
          <div
            key={tg.key}
            className={`flex items-center justify-between py-2.5 ${
              i < TOGGLES.length - 1 ? "border-b border-slate-50" : ""
            }`}
          >
            <span className="text-sm text-slate-600">{tg.label}</span>
            <Switch
              checked={prefs[tg.key] as boolean}
              onCheckedChange={(v) =>
                setPrefs((p) => ({ ...p, [tg.key]: v }))
              }
            />
          </div>
        ))}

        <Button onClick={save} disabled={pending} className="mt-4">
          <Check /> Salvar notificações
        </Button>
      </CardContent>
    </Card>
  );
}
