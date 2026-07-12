"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Crown, Mail, Pencil, Trash2, UserPlus, X } from "lucide-react";
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
import { ALL_PERMS, PERMISSIONS, type PermKey } from "@/lib/permissions";
import {
  cancelInvite,
  inviteMember,
  removeMember,
  updateMemberPermissions,
} from "./actions";

const SHORT: Record<string, string> = {
  conversas: "Conversas",
  leads: "Leads",
  ai: "IA",
  branding: "Marca",
  config: "Config",
  team: "Equipe",
};

interface Member {
  id: string;
  name: string | null;
  email: string;
  role: "owner" | "member";
  permissions: string[];
  image: string | null;
}
interface Invite {
  id: string;
  name: string;
  email: string;
  permissions: string[];
}

function initials(name: string | null, email: string) {
  return (name || email)
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function PermChecklist({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const set = new Set(value);
  const allOn = ALL_PERMS.every((k) => set.has(k));
  function toggle(k: PermKey) {
    onChange(set.has(k) ? value.filter((x) => x !== k) : [...value, k]);
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <Label>O que ele pode fazer</Label>
        <button
          type="button"
          onClick={() => onChange(allOn ? [] : [...ALL_PERMS])}
          className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
        >
          {allOn ? "Limpar tudo" : "Dar acesso total"}
        </button>
      </div>
      <div className="space-y-1.5">
        {PERMISSIONS.map((p) => {
          const on = set.has(p.key);
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => toggle(p.key)}
              className={`w-full flex items-start gap-2.5 p-2 rounded-lg border text-left transition ${
                on
                  ? "border-emerald-200 bg-emerald-50/60"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span
                className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                  on
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : "border-slate-300"
                }`}
              >
                {on && <Check size={11} />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-slate-800">
                  {p.label}
                </span>
                <span className="block text-xs text-slate-400">{p.desc}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PermChips({ perms }: { perms: string[] }) {
  if (perms.length === 0) {
    return <span className="text-[11px] text-slate-400">Sem acesso ainda</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {perms.map((p) => (
        <span
          key={p}
          className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600"
        >
          {SHORT[p] ?? p}
        </span>
      ))}
    </div>
  );
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
  const [pending, start] = useTransition();

  // convite (painel fixo à direita)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [perms, setPerms] = useState<string[]>(["conversas", "leads"]);

  // edição de permissões de um membro (dialog)
  const [editing, setEditing] = useState<Member | null>(null);
  const [editPerms, setEditPerms] = useState<string[]>([]);

  function convidar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (perms.length === 0) {
      toast.error("Marque ao menos uma permissão.");
      return;
    }
    const fd = new FormData();
    fd.set("name", name);
    fd.set("email", email);
    fd.set("permissions", perms.join(","));
    start(async () => {
      const res = await inviteMember(fd);
      if (res.ok) {
        toast.success("Convite enviado por e-mail!");
        setName("");
        setEmail("");
        setPerms(["conversas", "leads"]);
        router.refresh();
      } else {
        toast.error(res.error ?? "Não foi possível convidar.");
      }
    });
  }

  function openEdit(m: Member) {
    setEditPerms(m.permissions);
    setEditing(m);
  }
  function salvarPerms() {
    if (!editing) return;
    start(async () => {
      const res = await updateMemberPermissions(editing.id, editPerms);
      if (res.ok) {
        toast.success("Permissões atualizadas.");
        setEditing(null);
        router.refresh();
      } else {
        toast.error(res.error ?? "Falha ao salvar.");
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
    <div className="grid gap-5 lg:grid-cols-5 items-start">
      {/* Lista */}
      <div className="lg:col-span-3 space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-slate-800 mb-2">
            Pessoas com acesso
          </h2>
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
                    <img
                      src={m.image}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    initials(m.name, m.email)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-800 truncate flex items-center gap-1.5">
                    {m.name ?? "-"}
                    {m.id === currentUserId && (
                      <span className="text-[11px] text-slate-400">(você)</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 truncate mb-1">
                    {m.email}
                  </div>
                  {m.role === "owner" ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 inline-flex items-center gap-1">
                      <Crown size={10} /> Acesso total
                    </span>
                  ) : (
                    <PermChips perms={m.permissions} />
                  )}
                </div>
                {m.role !== "owner" ? (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-slate-400"
                      disabled={pending}
                      onClick={() => openEdit(m)}
                      aria-label="Editar permissões"
                    >
                      <Pencil size={15} />
                    </Button>
                    {m.id !== currentUserId && (
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
                    )}
                  </>
                ) : (
                  <span className="w-8" />
                )}
              </div>
            ))}
          </Card>
        </div>

        {invites.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-800 mb-2">
              Convites pendentes
            </h2>
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
                    <div className="text-xs text-slate-400 truncate mb-1">
                      {inv.email} · aguardando aceitar
                    </div>
                    <PermChips perms={inv.permissions} />
                  </div>
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
      </div>

      {/* Convite (painel fixo) */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus size={16} className="text-emerald-600" /> Convidar
              funcionário
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Ele recebe um e-mail pra criar a própria senha.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={convidar} className="space-y-3">
              <div className="grid gap-2">
                <Label htmlFor="inv-name">Nome</Label>
                <Input
                  id="inv-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Ana Lima"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="inv-email">E-mail</Label>
                <Input
                  id="inv-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="ana@empresa.com"
                />
              </div>
              <PermChecklist value={perms} onChange={setPerms} />
              <Button type="submit" className="w-full" disabled={pending}>
                Enviar convite
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Editar permissões de um membro */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permissões de {editing?.name ?? "funcionário"}</DialogTitle>
          </DialogHeader>
          <PermChecklist value={editPerms} onChange={setEditPerms} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={salvarPerms} disabled={pending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
