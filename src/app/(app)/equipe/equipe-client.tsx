"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Crown, Mail, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cancelInvite, inviteMember, removeMember } from "./actions";

interface Member {
  id: string;
  name: string | null;
  email: string;
  role: "owner" | "member";
  teamRole: "gerente" | "atendente" | null;
  image: string | null;
}
interface Invite {
  id: string;
  name: string;
  email: string;
  teamRole: "gerente" | "atendente";
}

function initials(name: string | null, email: string) {
  const base = name || email;
  return base
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function roleLabel(m: Member): string {
  if (m.role === "owner") return "Dono";
  return m.teamRole === "gerente" ? "Gerente" : "Atendente";
}

export function EquipeClient({
  currentUserId,
  members,
  invites,
}: {
  currentUserId: string;
  members: Member[];
  invites: Invite[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<"atendente" | "gerente">("atendente");
  const [pending, start] = useTransition();

  function convidar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("teamRole", role);
    start(async () => {
      const res = await inviteMember(fd);
      if (res.ok) {
        toast.success("Convite enviado por e-mail!");
        setOpen(false);
        setRole("atendente");
        router.refresh();
      } else {
        toast.error(res.error ?? "Não foi possível convidar.");
      }
    });
  }

  function remover(id: string) {
    start(async () => {
      const res = await removeMember(id);
      if (res.ok) {
        toast.success("Funcionário removido.");
        router.refresh();
      } else {
        toast.error(res.error ?? "Falha ao remover.");
      }
    });
  }

  function cancelar(id: string) {
    start(async () => {
      const res = await cancelInvite(id);
      if (res.ok) {
        toast.success("Convite cancelado.");
        router.refresh();
      } else {
        toast.error(res.error ?? "Falha ao cancelar.");
      }
    });
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800">
          Pessoas com acesso
        </h2>
        <Button onClick={() => setOpen(true)}>
          <UserPlus size={15} /> Convidar funcionário
        </Button>
      </div>

      <Card className="p-0 gap-0 overflow-hidden">
        {members.map((m, i) => (
          <div
            key={m.id}
            className={`px-4 py-3 flex items-center gap-3 ${
              i < members.length - 1 ? "border-b border-slate-50" : ""
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden">
              {m.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.image} alt="" className="w-full h-full object-cover" />
              ) : (
                initials(m.name, m.email)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-800 truncate flex items-center gap-1.5">
                {m.name ?? "—"}
                {m.id === currentUserId && (
                  <span className="text-[11px] text-slate-400">(você)</span>
                )}
              </div>
              <div className="text-xs text-slate-400 truncate">{m.email}</div>
            </div>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1 ${
                m.role === "owner"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {m.role === "owner" && <Crown size={11} />}
              {roleLabel(m)}
            </span>
            {m.role !== "owner" && m.id !== currentUserId ? (
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-slate-400 hover:text-red-600"
                disabled={pending}
                onClick={() => remover(m.id)}
                aria-label="Remover"
              >
                <Trash2 size={15} />
              </Button>
            ) : (
              <span className="w-8" />
            )}
          </div>
        ))}
      </Card>

      {invites.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">
            Convites pendentes
          </h3>
          <Card className="p-0 gap-0 overflow-hidden">
            {invites.map((inv, i) => (
              <div
                key={inv.id}
                className={`px-4 py-3 flex items-center gap-3 ${
                  i < invites.length - 1 ? "border-b border-slate-50" : ""
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                  <Mail size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-800 truncate">
                    {inv.name}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {inv.email} · aguardando aceitar
                  </div>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {inv.teamRole === "gerente" ? "Gerente" : "Atendente"}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-slate-400 hover:text-red-600"
                  disabled={pending}
                  onClick={() => cancelar(inv.id)}
                  aria-label="Cancelar convite"
                >
                  <X size={15} />
                </Button>
              </div>
            ))}
          </Card>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar funcionário</DialogTitle>
          </DialogHeader>
          <form onSubmit={convidar} className="space-y-3">
            <div className="grid gap-2">
              <Label htmlFor="inv-name">Nome</Label>
              <Input id="inv-name" name="name" required placeholder="Ana Lima" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="inv-email">E-mail</Label>
              <Input
                id="inv-email"
                name="email"
                type="email"
                required
                placeholder="ana@empresa.com"
              />
            </div>
            <div className="grid gap-2">
              <Label>Papel</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as "atendente" | "gerente")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="atendente">Atendente</SelectItem>
                  <SelectItem value="gerente">Gerente</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {role === "gerente"
                  ? "Acessa tudo, menos marca, plano e usuários."
                  : "Vê e responde Conversas e vê os Leads."}
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                Enviar convite
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
