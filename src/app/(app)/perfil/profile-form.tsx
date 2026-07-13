"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { PhotoActionsMenu } from "@/components/photo-actions-menu";
import { PASSWORD_RULES, isPasswordValid } from "@/lib/password";
import {
  changePassword,
  removeAvatar,
  saveAvatar,
  updateProfile,
} from "../profile-actions";

/**
 * Recorta a imagem num quadrado centralizado e redimensiona no navegador.
 * Avatares são sempre círculos. Sem isso, fotos não-quadradas (ex.: logos
 * retangulares) ficam esticadas dentro do círculo.
 */
function resizeToDataUrl(file: File, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("canvas"));
      ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new Error("imagem inválida"));
    img.src = url;
  });
}

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
    image: string | null;
  };
}) {
  const router = useRouter();
  const [image, setImage] = useState(user.image);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  // dados da conta, bloqueados até clicar no lápis
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);

  function cancelEdit() {
    setName(user.name);
    setEmail(user.email);
    setEditing(false);
  }

  // senha
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const passOk = isPasswordValid(next);
  const matchOk = confirm.length > 0 && next === confirm;

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Envie uma imagem.");
      return;
    }
    start(async () => {
      try {
        const dataUrl = await resizeToDataUrl(file);
        const res = await saveAvatar(dataUrl);
        if (res.ok) {
          setImage(dataUrl);
          toast.success("Foto atualizada!");
          router.refresh();
        } else {
          toast.error(res.error ?? "Falha ao salvar a foto.");
        }
      } catch {
        toast.error("Não consegui processar a imagem.");
      }
    });
  }

  function removePhoto() {
    start(async () => {
      const res = await removeAvatar();
      if (res.ok) {
        setImage(null);
        toast.success("Foto removida.");
        router.refresh();
      } else {
        toast.error(res.error ?? "Não foi possível remover a foto.");
      }
    });
  }

  function saveInfo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await updateProfile(fd);
      if (res.ok) {
        toast.success("Perfil salvo!");
        setEditing(false);
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
    <div className="grid gap-4 lg:grid-cols-2 items-start">
      {/* Foto + dados */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados da conta</CardTitle>
          {!editing && (
            <CardAction>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setEditing(true)}
                aria-label="Editar dados da conta"
              >
                <Pencil size={15} />
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-5">
            <PhotoActionsMenu
              src={image}
              alt="Foto de perfil"
              filename="foto-perfil.jpg"
              onPick={() => fileRef.current?.click()}
              onRemove={removePhoto}
              hideChangeInMenu
            >
              <Avatar className="size-16 cursor-pointer">
                {image && <AvatarImage src={image} alt={user.name} />}
                <AvatarFallback className="bg-emerald-500 text-white text-lg font-bold">
                  {initials(user.name, user.email)}
                </AvatarFallback>
              </Avatar>
            </PhotoActionsMenu>
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
              <Input
                id="name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!editing}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!editing}
                required
              />
            </div>
            {editing && (
              <div className="flex items-center gap-2">
                <Button type="submit" disabled={pending}>
                  Salvar alterações
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={pending}
                  onClick={cancelEdit}
                >
                  Cancelar
                </Button>
              </div>
            )}
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
