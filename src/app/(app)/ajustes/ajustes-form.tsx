"use client";

import { useState, useTransition } from "react";
import { Check, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
}: {
  assistantName: string;
  welcomeMessage: string;
  tone: string;
  triggers: string[];
}) {
  const [selTone, setSelTone] = useState(tone || "Amigável");
  const [tags, setTags] = useState<string[]>(triggers);
  const [newTag, setNewTag] = useState("");
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
    <Card>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="assistantName">Nome do assistente</Label>
            <Input
              id="assistantName"
              name="assistantName"
              defaultValue={assistantName}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="welcomeMessage">Mensagem de boas-vindas</Label>
            <Textarea
              id="welcomeMessage"
              name="welcomeMessage"
              rows={3}
              defaultValue={welcomeMessage}
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

          <Button type="submit" disabled={pending}>
            <Check /> Salvar ajustes
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
