"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Plus, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WhatsappFormatToolbar } from "@/components/whatsapp-format-toolbar";
import { WhatsappText } from "@/components/whatsapp-text";
import { createQuickReply, updateQuickReply, deleteQuickReply } from "./actions";

export interface QuickReplyItem {
  id: string;
  shortcut: string;
  message: string;
}

export function AtalhosClient({ items }: { items: QuickReplyItem[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<QuickReplyItem | null>(null);
  const [viewing, setViewing] = useState<QuickReplyItem | null>(null);
  const [shortcut, setShortcut] = useState("");
  const [message, setMessage] = useState("");
  const messageRef = useRef<HTMLTextAreaElement>(null);

  function openNew() {
    setEditing(null);
    setShortcut("");
    setMessage("");
    setOpen(true);
  }
  function openEdit(item: QuickReplyItem) {
    setEditing(item);
    setShortcut(item.shortcut);
    setMessage(item.message);
    setOpen(true);
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("shortcut", shortcut);
    fd.set("message", message);
    start(async () => {
      const res = editing
        ? await updateQuickReply(editing.id, fd)
        : await createQuickReply(fd);
      if (res.ok) {
        toast.success(editing ? "Atalho atualizado." : "Atalho criado.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error ?? "Não foi possível salvar.");
      }
    });
  }

  function remover(id: string) {
    if (!confirm("Apagar esse atalho?")) return;
    start(async () => {
      const res = await deleteQuickReply(id);
      if (res.ok) {
        toast.success("Atalho removido.");
        router.refresh();
      } else {
        toast.error(res.error ?? "Falha ao remover.");
      }
    });
  }

  return (
    <div>
      <Button className="mb-5" onClick={openNew}>
        <Plus size={15} /> Novo atalho
      </Button>

      <Card className="p-0 gap-0 overflow-hidden">
        {items.length === 0 ? (
          <p className="p-4 text-sm text-slate-400">
            Nenhum atalho ainda. Crie um pra testar: digite "/" no chat de uma
            conversa e ele aparece na lista.
          </p>
        ) : (
          items.map((item, i) => (
            <div
              key={item.id}
              className={`px-4 py-3 flex items-center gap-3 ${
                i < items.length - 1 ? "border-b border-slate-50" : ""
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Zap size={15} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-800">
                  /{item.shortcut}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  <WhatsappText text={item.message} />
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-slate-400"
                disabled={pending}
                onClick={() => setViewing(item)}
                aria-label="Ver"
              >
                <Eye size={15} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-slate-400"
                disabled={pending}
                onClick={() => openEdit(item)}
                aria-label="Editar"
              >
                <Pencil size={15} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-slate-400 hover:text-red-600"
                disabled={pending}
                onClick={() => remover(item.id)}
                aria-label="Apagar"
              >
                <Trash2 size={15} />
              </Button>
            </div>
          ))
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar atalho" : "Novo atalho"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid gap-1.5">
              <Label htmlFor="shortcut">Atalho</Label>
              <Input
                id="shortcut"
                value={shortcut}
                onChange={(e) => setShortcut(e.target.value)}
                placeholder="boleto"
                required
              />
              <p className="text-xs text-muted-foreground">
                Sem espaço nem barra, é só o nome. Vira /{shortcut || "..."} no chat.
              </p>
            </div>
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="message">Mensagem</Label>
                <WhatsappFormatToolbar
                  value={message}
                  onChange={setMessage}
                  targetRef={messageRef}
                />
              </div>
              <Textarea
                id="message"
                ref={messageRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Segue o boleto atualizado, qualquer coisa me chama por aqui!"
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pending} className="w-full">
                {editing ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent>
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle>/{viewing.shortcut}</DialogTitle>
              </DialogHeader>
              <div className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-lg p-3 border border-slate-100">
                <WhatsappText text={viewing.message} />
              </div>
              <div className="flex justify-end pt-1">
                <Button
                  size="sm"
                  onClick={() => {
                    const item = viewing;
                    setViewing(null);
                    openEdit(item);
                  }}
                >
                  <Pencil size={14} /> Editar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
