"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  DAY_KEYS,
  DAY_LABELS,
  type BusinessHours,
  type DayKey,
} from "@/lib/business-hours";
import { saveBusinessHours } from "../actions";

interface Props {
  enabled: boolean;
  hours: BusinessHours;
  outOfHoursMessage: string;
}

export function BusinessHoursCard({ enabled, hours, outOfHoursMessage }: Props) {
  const [on, setOn] = useState(enabled);
  const [days, setDays] = useState<BusinessHours>(hours);
  const [message, setMessage] = useState(outOfHoursMessage);
  const [pending, start] = useTransition();

  function updateDay(day: DayKey, patch: Partial<BusinessHours[DayKey]>) {
    setDays((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  }

  function save() {
    const fd = new FormData();
    if (on) fd.set("businessHoursEnabled", "on");
    fd.set("businessHours", JSON.stringify(days));
    fd.set("outOfHoursMessage", message);
    start(async () => {
      await saveBusinessHours(fd);
      toast.success("Horário de atendimento salvo!");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Horário de atendimento</CardTitle>
        <p className="text-xs text-muted-foreground">
          Fora do horário, a IA manda um único aviso e a conversa fica esperando
          você quando o expediente voltar.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between py-1">
          <span className="text-sm text-slate-600">
            Só atender dentro do horário definido
          </span>
          <Switch checked={on} onCheckedChange={setOn} />
        </div>

        {on && (
          <>
            <div className="space-y-1.5">
              {DAY_KEYS.map((day) => {
                const d = days[day];
                return (
                  <div
                    key={day}
                    className="flex items-center gap-3 py-1.5 border-b border-slate-50 last:border-0"
                  >
                    <Switch
                      checked={d.enabled}
                      onCheckedChange={(v) => updateDay(day, { enabled: v })}
                    />
                    <span className="text-sm text-slate-600 w-20 shrink-0">
                      {DAY_LABELS[day]}
                    </span>
                    <Input
                      type="time"
                      value={d.start}
                      disabled={!d.enabled}
                      onChange={(e) => updateDay(day, { start: e.target.value })}
                      className="w-28"
                    />
                    <span className="text-xs text-slate-400">até</span>
                    <Input
                      type="time"
                      value={d.end}
                      disabled={!d.enabled}
                      onChange={(e) => updateDay(day, { end: e.target.value })}
                      className="w-28"
                    />
                  </div>
                );
              })}
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-slate-700">
                Mensagem de fora do expediente
              </label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
              />
            </div>
          </>
        )}

        <Button onClick={save} disabled={pending} className="mt-1">
          <Check /> Salvar horário
        </Button>
      </CardContent>
    </Card>
  );
}
