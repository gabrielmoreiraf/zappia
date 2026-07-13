"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Image as ImageIcon, Pencil } from "lucide-react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { PhotoActionsMenu } from "@/components/photo-actions-menu";
import type { BusinessProfile } from "@/lib/whatsapp";
import { saveWhatsappProfile, saveWhatsappProfilePicture } from "./whatsapp-profile-actions";

export function WhatsappProfileCard({ profile }: { profile: BusinessProfile }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [uploadingPhoto, startPhoto] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState(profile.profilePictureUrl ?? null);

  // campos, bloqueados até clicar no lápis
  const [editing, setEditing] = useState(false);
  const [about, setAbout] = useState(profile.about ?? "");
  const [description, setDescription] = useState(profile.description ?? "");
  const [email, setEmail] = useState(profile.email ?? "");
  const [website, setWebsite] = useState(profile.websites?.[0] ?? "");
  const [address, setAddress] = useState(profile.address ?? "");

  function cancelEdit() {
    setAbout(profile.about ?? "");
    setDescription(profile.description ?? "");
    setEmail(profile.email ?? "");
    setWebsite(profile.websites?.[0] ?? "");
    setAddress(profile.address ?? "");
    setEditing(false);
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await saveWhatsappProfile(fd);
      if (res.ok) {
        toast.success("Perfil do WhatsApp atualizado.");
        setEditing(false);
        router.refresh();
      } else {
        toast.error(res.error ?? "Falha ao salvar.");
      }
    });
  }

  function pickPhoto() {
    fileRef.current?.click();
  }

  function onPhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Escolha uma imagem.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPhotoPreview(dataUrl);
      startPhoto(async () => {
        const res = await saveWhatsappProfilePicture(dataUrl);
        if (res.ok) {
          toast.success("Foto atualizada no WhatsApp.");
          router.refresh();
        } else {
          toast.error(res.error ?? "Falha ao enviar a foto.");
          setPhotoPreview(profile.profilePictureUrl ?? null);
        }
      });
    };
    reader.readAsDataURL(file);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Perfil do WhatsApp Business</CardTitle>
        <p className="text-xs text-muted-foreground">
          O que o cliente vê ao abrir a conversa: foto, sobre, horário e contato.
        </p>
        {!editing && (
          <CardAction>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setEditing(true)}
              aria-label="Editar perfil do WhatsApp"
            >
              <Pencil size={15} />
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <PhotoActionsMenu
            src={photoPreview}
            alt="Foto de perfil do WhatsApp"
            filename="foto-perfil-whatsapp.jpg"
            onPick={pickPhoto}
            removeDisabledReason="Pra tirar a foto, é só trocar por outra."
            className="relative w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center overflow-hidden shrink-0 group"
          >
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoPreview} alt="" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon size={22} />
            )}
          </PhotoActionsMenu>
          <div>
            <div className="text-sm font-medium text-slate-700">Foto de perfil</div>
            <div className="text-xs text-slate-400">
              {uploadingPhoto ? "Enviando…" : "Clique na foto pra ver as opções"}
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPhotoSelected}
            disabled={uploadingPhoto}
          />
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-1.5">
            <Label htmlFor="about">Recado (status)</Label>
            <Input
              id="about"
              name="about"
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              disabled={!editing}
              placeholder="Atendimento rápido e sem enrolação"
              maxLength={139}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="description">Sobre o negócio</Label>
            <Textarea
              id="description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!editing}
              rows={2}
              placeholder="Ex.: horário de atendimento, o que a empresa faz…"
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="grid gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!editing}
                placeholder="contato@negocio.com"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="website">Site</Label>
              <Input
                id="website"
                name="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                disabled={!editing}
                placeholder="https://..."
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              name="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={!editing}
              placeholder="Rua, número, cidade"
            />
          </div>
          {editing && (
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Salvando…" : "Salvar perfil"}
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
  );
}
