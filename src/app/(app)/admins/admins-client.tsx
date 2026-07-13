"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, ShieldCheck, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inviteAdmin, cancelAdminInvite, revokeAdmin } from "./actions";

interface Admin {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}
interface Invite {
  id: string;
  name: string;
  email: string;
}

function initials(name: string | null, email: string) {
  return (name || email)
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AdminsClient({
  currentUserId,
  admins,
  invites,
}: {
  currentUserId: string;
  admins: Admin[];
  invites: Invite[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  function convidar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("name", name);
    fd.set("email", email);
    start(async () => {
      const res = await inviteAdmin(fd);
      if (res.ok) {
        toast.success("Convite enviado por e-mail!");
        setName("");
        setEmail("");
        router.refresh();
      } else {
        toast.error(res.error ?? "Não foi possível convidar.");
      }
    });
  }

  function revogar(id: string) {
    if (!confirm("Remover o acesso de administrador dessa pessoa?")) return;
    start(async () => {
      const res = await revokeAdmin(id);
      if (res.ok) {
        toast.success("Acesso removido.");
        router.refresh();
      } else {
        toast.error(res.error ?? "Falha ao remover.");
      }
    });
  }

  function cancelar(id: string) {
    start(async () => {
      const res = await cancelAdminInvite(id);
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
      <div className="lg:col-span-3 space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-slate-800 mb-2">
            Administradores
          </h2>
          <Card className="p-0 gap-0 overflow-hidden">
            {admins.map((a, i) => (
              <div
                key={a.id}
                className={`px-4 py-3 flex items-center gap-3 ${
                  i < admins.length - 1 ? "border-b border-slate-50" : ""
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden">
                  {a.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    initials(a.name, a.email)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-800 truncate flex items-center gap-1.5">
                    {a.name ?? "-"}
                    {a.id === currentUserId && (
                      <span className="text-[11px] text-slate-400">(você)</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 truncate mb-1">
                    {a.email}
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 inline-flex items-center gap-1">
                    <ShieldCheck size={10} /> Acesso total
                  </span>
                </div>
                {a.id !== currentUserId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-slate-400 hover:text-red-600"
                    disabled={pending}
                    onClick={() => revogar(a.id)}
                    aria-label="Remover acesso"
                  >
                    <Trash2 size={15} />
                  </Button>
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
                    <div className="text-xs text-slate-400 truncate">
                      {inv.email} · aguardando aceitar
                    </div>
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

      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus size={16} className="text-emerald-600" /> Convidar
              administrador
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Ele recebe um e-mail pra criar a senha e passa a ver todos os
              clientes e o faturamento, igual você.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={convidar} className="space-y-3">
              <div className="grid gap-2">
                <Label htmlFor="adm-name">Nome</Label>
                <Input
                  id="adm-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Ana Lima"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="adm-email">E-mail</Label>
                <Input
                  id="adm-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="ana@zappia.app"
                />
              </div>
              <Button type="submit" className="w-full" disabled={pending}>
                Enviar convite
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
