"use client";

import { useState, useTransition } from "react";
import { Bot, Check, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveAjustes } from "../actions";

const TONES = ["Amigável", "Neutro", "Formal"];

export function AjustesForm({
  assistantName,
  welcomeMessage,
  tone,
  triggers,
  waitingMessage,
  closingMessage,
  inactivityMinutes,
}: {
  assistantName: string;
  welcomeMessage: string;
  tone: string;
  triggers: string[];
  waitingMessage: string;
  closingMessage: string;
  inactivityMinutes: number;
}) {
  const [name, setName] = useState(assistantName);
  const [welcome, setWelcome] = useState(welcomeMessage);
  const [selTone, setSelTone] = useState(tone || "Amigável");
  const [tags, setTags] = useState<string[]>(triggers);
  const [newTag, setNewTag] = useState("");
  const [waiting, setWaiting] = useState(waitingMessage);
  const [closing, setClosing] = useState(closingMessage);
  const [mins, setMins] = useState(String(inactivityMinutes));
  const [pending, start] = useTransition();

  function addTag() {
    const t = newTag.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setNewTag("");
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("tone", selTone);
    fd.set("handoffTriggers", tags.join(","));
    start(async () => {
      await saveAjustes(fd);
      toast.success("Ajustes salvos!");
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 items-start">
      <Card>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="assistantName">Nome do assistente</Label>
              <Input
                id="assistantName"
                name="assistantName"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="welcomeMessage">Mensagem de boas-vindas</Label>
              <Textarea
                id="welcomeMessage"
                name="welcomeMessage"
                rows={3}
                value={welcome}
                onChange={(e) => setWelcome(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label>Tom da conversa</Label>
              <div className="flex gap-2">
                {TONES.map((t) => (
                  <Button
                    key={t}
                    type="button"
                    variant={selTone === t ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelTone(t)}
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Encaminhar pra você quando o cliente disser</Label>
              <div className="flex flex-wrap gap-2 items-center">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 flex items-center gap-1"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => setTags(tags.filter((x) => x !== t))}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <div className="flex items-center gap-1">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="add"
                    className="h-8 w-24 text-xs"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={addTag}
                  >
                    <Plus size={14} />
                  </Button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-700">
                  Ausência e espera
                </p>
                <p className="text-xs text-muted-foreground">
                  O que a IA faz quando o cliente fica na fila ou some.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="waitingMessage">
                  Mensagem enquanto o cliente aguarda você
                </Label>
                <Textarea
                  id="waitingMessage"
                  name="waitingMessage"
                  rows={2}
                  value={waiting}
                  onChange={(e) => setWaiting(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Enviada quando o cliente insiste enquanto a conversa está na fila
                  pra você. A IA para de improvisar.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="inactivityMinutes">
                  Encerrar por inatividade após (minutos)
                </Label>
                <Input
                  id="inactivityMinutes"
                  name="inactivityMinutes"
                  type="number"
                  min={0}
                  className="w-32"
                  value={mins}
                  onChange={(e) => setMins(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  0 desliga. Conversas aguardando você não são encerradas.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="closingMessage">Mensagem de encerramento</Label>
                <Textarea
                  id="closingMessage"
                  name="closingMessage"
                  rows={2}
                  value={closing}
                  onChange={(e) => setClosing(e.target.value)}
                />
              </div>
            </div>

            <Button type="submit" disabled={pending}>
              <Check /> Salvar ajustes
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Preview ao vivo: como fica no WhatsApp do cliente */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pré-visualização</CardTitle>
          <p className="text-xs text-muted-foreground">
            Como a primeira mensagem aparece no WhatsApp do seu cliente.
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl bg-[#e5ddd5] p-4">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-black/5">
              <span className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                <Bot size={16} className="text-white" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-800 truncate">
                  {name || "Assistente"}
                </div>
                <div className="text-[11px] text-slate-500">online</div>
              </div>
            </div>
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-lg rounded-tl-none bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
                {welcome || "Sua mensagem de boas-vindas aparece aqui…"}
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Tom selecionado:{" "}
            <span className="font-medium text-slate-600">{selTone}</span>. Isso
            também molda como a IA responde durante toda a conversa, não só a
            mensagem de boas-vindas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
