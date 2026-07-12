"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Bot,
  ImagePlus,
  MessageSquare,
  RotateCcw,
  Store,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPersonalization, savePersonalization } from "./actions";

const DEFAULT_BRAND = "#10b981";

const PRESETS = [
  "#10b981", // esmeralda (padrão)
  "#0ea5e9", // azul
  "#6366f1", // índigo
  "#8b5cf6", // violeta
  "#ec4899", // rosa
  "#f97316", // laranja
  "#ef4444", // vermelho
  "#14b8a6", // teal
  "#0f172a", // grafite
];

/** Encaixa a logo (sem cortar) num quadrado com fundo branco. */
function logoToDataUrl(file: File, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("canvas"));
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      const scale = Math.min(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };
    img.onerror = () => reject(new Error("imagem inválida"));
    img.src = url;
  });
}

export function PersonalizacaoForm({
  name,
  logoUrl,
  brandColor,
}: {
  name: string;
  logoUrl: string | null;
  brandColor: string | null;
}) {
  const router = useRouter();
  const [logo, setLogo] = useState<string | null>(logoUrl);
  const [nome, setNome] = useState(name);
  const [color, setColor] = useState(brandColor ?? DEFAULT_BRAND);
  const [hex, setHex] = useState(brandColor ?? DEFAULT_BRAND);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function applyHex(v: string) {
    let h = v.trim();
    if (h && !h.startsWith("#")) h = "#" + h;
    setHex(h);
    if (/^#[0-9a-fA-F]{6}$/.test(h)) setColor(h.toLowerCase());
  }
  function pickColor(c: string) {
    setColor(c);
    setHex(c);
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Envie uma imagem.");
      return;
    }
    logoToDataUrl(file)
      .then(setLogo)
      .catch(() => toast.error("Não consegui processar a imagem."));
  }

  function salvar() {
    start(async () => {
      const res = await savePersonalization({
        name: nome,
        brandColor: color,
        logo,
      });
      if (res.ok) {
        toast.success("Personalização salva!");
        router.refresh();
      } else {
        toast.error(res.error ?? "Não foi possível salvar.");
      }
    });
  }

  function restaurar() {
    start(async () => {
      const res = await resetPersonalization();
      if (res.ok) {
        setLogo(null);
        pickColor(DEFAULT_BRAND);
        toast.success("Voltou ao padrão.");
        router.refresh();
      } else {
        toast.error(res.error ?? "Não foi possível restaurar.");
      }
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2 items-start">
      {/* Controles */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Store size={16} className="text-emerald-600" /> Marca do negócio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl border border-slate-200 bg-white overflow-hidden flex items-center justify-center shrink-0">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logo}
                    alt="Logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Store size={22} className="text-slate-300" />
                )}
              </div>
              <div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() => fileRef.current?.click()}
                  >
                    <ImagePlus size={14} /> Enviar logo
                  </Button>
                  {logo && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      className="text-red-600"
                      onClick={() => setLogo(null)}
                    >
                      <Trash2 size={14} /> Tirar
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG ou JPG. A gente ajusta o tamanho.
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

            <div className="grid gap-2">
              <Label htmlFor="nome">Nome do negócio</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cor do sistema</CardTitle>
            <p className="text-xs text-muted-foreground">
              Troque o verde pela cor da sua marca. Vale pra todo o painel.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2.5">
              {PRESETS.map((c) => {
                const on = color.toLowerCase() === c.toLowerCase();
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => pickColor(c)}
                    aria-label={`Cor ${c}`}
                    className="w-8 h-8 rounded-lg transition"
                    style={{
                      background: c,
                      outline: on ? `2px solid ${c}` : "none",
                      outlineOffset: 2,
                    }}
                  />
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(hex) ? hex : color}
                onChange={(e) => pickColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-slate-200 bg-white p-0.5 cursor-pointer"
                aria-label="Escolher cor exata"
              />
              <Input
                value={hex}
                onChange={(e) => applyHex(e.target.value)}
                placeholder="#10b981"
                className="w-32 font-mono uppercase"
                maxLength={7}
              />
              <span className="text-xs text-muted-foreground">
                cor exata da marca
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-2">
          <Button onClick={salvar} disabled={pending || !nome.trim()}>
            Salvar personalização
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={restaurar}
            className="text-slate-500"
          >
            <RotateCcw size={14} /> Restaurar padrão
          </Button>
        </div>
      </div>

      {/* Preview ao vivo */}
      <div className="lg:sticky lg:top-0">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
          Prévia ao vivo
        </p>
        <PreviewPanel logo={logo} nome={nome} color={color} />
        <p className="text-xs text-muted-foreground mt-2">
          É só uma prévia com dados de exemplo. Nada é aplicado até você salvar.
        </p>
      </div>
    </div>
  );
}

/** Mini-painel de exemplo que reflete logo, nome e cor em tempo real. */
function PreviewPanel({
  logo,
  nome,
  color,
}: {
  logo: string | null;
  nome: string;
  color: string;
}) {
  return (
    <div
      className="app-theme rounded-2xl border border-slate-200 overflow-hidden bg-slate-100 shadow-sm"
      style={{ "--brand": color } as React.CSSProperties}
    >
      <div className="flex h-[300px] text-[11px]">
        {/* Sidebar */}
        <div className="w-36 bg-white border-r border-slate-200 flex flex-col p-2.5 shrink-0">
          <div className="flex items-center gap-1.5 mb-3">
            <span className="w-5 h-5 rounded-md bg-emerald-500 flex items-center justify-center">
              <Bot size={12} className="text-white" />
            </span>
            <span className="font-bold text-slate-900 text-xs">Zappia</span>
          </div>
          <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-50 border border-slate-100 mb-2.5">
            <span className="w-5 h-5 rounded-md overflow-hidden bg-emerald-500 flex items-center justify-center shrink-0">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt="" className="w-full h-full object-cover" />
              ) : (
                <Store size={11} className="text-white" />
              )}
            </span>
            <span className="font-semibold text-slate-800 truncate">
              {nome || "Seu negócio"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-emerald-50 text-emerald-700 font-medium">
            <MessageSquare size={12} /> Conversas
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-slate-500">
            <Users size={12} /> Leads
          </div>
          <div className="mt-auto">
            <div className="h-7 rounded-md bg-emerald-500 text-white flex items-center justify-center font-medium">
              Nova conversa
            </div>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="h-9 bg-white border-b border-slate-100 flex items-center justify-between px-3 shrink-0">
            <span className="text-slate-400">Buscar…</span>
            <div className="flex items-center gap-2">
              <Bell size={13} className="text-slate-400" />
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-semibold text-[9px]">
                GM
              </span>
            </div>
          </div>
          <div className="p-3 space-y-2.5 overflow-hidden">
            <div className="flex gap-2">
              <div className="flex-1 bg-white rounded-lg border border-slate-100 p-2">
                <span className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1">
                  <Users size={12} />
                </span>
                <div className="font-bold text-slate-900 text-sm">128</div>
                <div className="text-slate-400 text-[10px]">Leads</div>
              </div>
              <div className="flex-1 bg-white rounded-lg border border-slate-100 p-2">
                <span className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1">
                  <MessageSquare size={12} />
                </span>
                <div className="font-bold text-slate-900 text-sm">342</div>
                <div className="text-slate-400 text-[10px]">Conversas</div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-slate-100 p-2.5 space-y-1.5">
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 text-slate-600 rounded-xl rounded-tl-sm px-2 py-1">
                  Oi! Vocês têm vaga?
                </div>
              </div>
              <div className="flex justify-end">
                <div className="bg-emerald-500 text-white rounded-xl rounded-br-sm px-2 py-1">
                  Temos sim! Quer que eu te passe os detalhes?
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
