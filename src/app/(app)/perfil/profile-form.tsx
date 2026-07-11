"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PasswordInput } from "@/components/password-input";
import { PASSWORD_RULES, isPasswordValid } from "@/lib/password";
import { changePassword, updateProfile, uploadAvatar } from "../profile-actions";

function initials(name: string, email: string) {
  const base = name || email;
  return base
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ProfileForm({
  user,
}: {
  user: {
    name: string;
    email: string;
    plan: string;
    image: string | null;
  };
}) {
  const router = useRouter();
  const [image, setImage] = useState(user.image);
  const [plan, setPlan] = useState(user.plan);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  // senha
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const passOk = isPasswordValid(next);
  const matchOk = confirm.length > 0 && next === confirm;

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    start(async () => {
      const res = await uploadAvatar(fd);
      if (res.ok && res.url) {
        setImage(res.url);
        toast.success("Foto atualizada!");
        router.refresh();
      } else {
        toast.error(res.error ?? "Falha no upload.");
      }
    });
  }

  function saveInfo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("plan", plan);
    start(async () => {
      const res = await updateProfile(fd);
      if (res.ok) {
        toast.success("Perfil salvo!");
        router.refresh();
      } else {
        toast.error(res.error ?? "Não foi possível salvar.");
      }
    });
  }

  function savePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!passOk || !matchOk) return;
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await changePassword(fd);
      if (res.ok) {
        toast.success("Senha alterada!");
        (e.target as HTMLFormElement).reset();
        setNext("");
        setConfirm("");
      } else {
        toast.error(res.error ?? "Não foi possível alterar a senha.");
      }
    });
  }

  return (
    <div className="max-w-xl space-y-4">
      {/* Foto + dados */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados da conta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-5">
            <Avatar className="size-16">
              {image && <AvatarImage src={image} alt={user.name} />}
              <AvatarFallback className="bg-emerald-500 text-white text-lg font-bold">
                {initials(user.name, user.email)}
              </AvatarFallback>
            </Avatar>
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => fileRef.current?.click()}
              >
                <Camera /> Trocar foto
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                PNG ou JPG, até ~4MB.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={onPickFile}
              />
            </div>
          </div>

          <form onSubmit={saveInfo} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" defaultValue={user.name} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={user.email}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Plano</Label>
              <Select value={plan} onValueChange={setPlan}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Cobrança automática entra numa fase futura.
              </p>
            </div>
            <Button type="submit" disabled={pending}>
              Salvar alterações
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Senha */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Senha</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={savePassword} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="current">Senha atual</Label>
              <PasswordInput
                name="current"
                placeholder="Senha atual"
                autoComplete="current-password"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="next">Nova senha</Label>
              <PasswordInput
                name="next"
                placeholder="Nova senha"
                value={next}
                onChange={setNext}
                autoComplete="new-password"
              />
              <ul className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1">
                {PASSWORD_RULES.map((r) => {
                  const ok = r.test(next);
                  return (
                    <li
                      key={r.key}
                      className={`flex items-center gap-1.5 text-[11px] ${
                        ok ? "text-emerald-600" : "text-muted-foreground"
                      }`}
                    >
                      {ok ? <Check size={12} /> : <X size={12} />} {r.label}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm">Confirmar nova senha</Label>
              <PasswordInput
                name="confirm"
                placeholder="Confirmar nova senha"
                value={confirm}
                onChange={setConfirm}
                autoComplete="new-password"
              />
              {confirm.length > 0 && !matchOk && (
                <p className="text-[11px] text-red-500">
                  As senhas não coincidem
                </p>
              )}
            </div>
            <Button type="submit" disabled={pending || !passOk || !matchOk}>
              Alterar senha
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
