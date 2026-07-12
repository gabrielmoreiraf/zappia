"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BookOpen,
  Bot,
  ImagePlus,
  LayoutDashboard,
  MessageSquare,
  Palette,
  RotateCcw,
  Search,
  Settings,
  SlidersHorizontal,
  Store,
  Trash2,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPersonalization, savePersonalization } from "./actions";

const DEFAULT_BRAND = "#10b981";

const PRESETS = [
  "#10b981",
  "#0ea5e9",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
  "#ef4444",
  "#14b8a6",
  "#0f172a",
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
  userName,
  userEmail,
  userImage,
}: {
  name: string;
  logoUrl: string | null;
  brandColor: string | null;
  userName: string;
  userEmail: string;
  userImage: string | null;
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
        <PreviewPanel
          logo={logo}
          nome={nome}
          color={color}
          userName={userName}
          userEmail={userEmail}
          userImage={userImage}
        />
        <p className="text-xs text-muted-foreground mt-2">
          Uma réplica do seu painel com dados de exemplo. Nada é aplicado até você
          salvar.
        </p>
      </div>
    </div>
  );
}

/* -------- Prévia: réplica fiel do painel real (nav.tsx + topbar.tsx) -------- */

function NavItem({
  icon: Icon,
  label,
  active,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 px-1.5 py-1 rounded-md text-[10.5px] ${
        active
          ? "bg-emerald-50 text-emerald-700 font-medium"
          : "text-slate-600"
      }`}
    >
      <Icon size={12} /> <span className="truncate">{label}</span>
    </div>
  );
}

function GroupLabel({ children }: { children: string }) {
  return (
    <div className="text-[8px] font-semibold text-slate-400 uppercase tracking-wide px-1.5 mt-2.5 mb-0.5">
      {children}
    </div>
  );
}

function Metric({
  icon: Icon,
  value,
  label,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-100 p-1.5">
      <span className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1">
        <Icon size={11} />
      </span>
      <div className="font-bold text-slate-900 text-[13px] leading-none">
        {value}
      </div>
      <div className="text-slate-400 text-[8px] mt-0.5">{label}</div>
    </div>
  );
}

function PreviewPanel({
  logo,
  nome,
  color,
  userName,
  userEmail,
  userImage,
}: {
  logo: string | null;
  nome: string;
  color: string;
  userName: string;
  userEmail: string;
  userImage: string | null;
}) {
  const userInitial = (userName || userEmail || "?").charAt(0).toUpperCase();
  return (
    <div
      className="app-theme rounded-2xl border border-slate-200 overflow-hidden bg-slate-100 shadow-sm"
      style={{ "--brand": color } as React.CSSProperties}
    >
      <div className="flex h-[368px]">
        {/* Sidebar (igual nav.tsx) */}
        <div className="w-[176px] bg-white border-r border-slate-200 flex flex-col shrink-0">
          <div className="h-9 flex items-center gap-1.5 px-2.5 border-b border-slate-100 shrink-0">
            <span className="w-5 h-5 rounded-md bg-emerald-500 flex items-center justify-center">
              <Bot size={12} className="text-white" />
            </span>
            <span className="font-bold text-[12px] text-slate-900">Zappia</span>
          </div>
          <div className="p-2 flex-1 overflow-hidden">
            <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-50 border border-slate-100 mb-1">
              <span className="w-5 h-5 rounded-md overflow-hidden bg-emerald-500 flex items-center justify-center shrink-0">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Store size={11} className="text-white" />
                )}
              </span>
              <span className="text-[11px] font-semibold text-slate-800 truncate">
                {nome || "Seu negócio"}
              </span>
            </div>

            <GroupLabel>Operação</GroupLabel>
            <NavItem icon={LayoutDashboard} label="Dashboard" />
            <NavItem icon={MessageSquare} label="Conversas" active />
            <NavItem icon={Users} label="Leads" />

            <GroupLabel>IA</GroupLabel>
            <NavItem icon={BookOpen} label="Base de conhecimento" />
            <NavItem icon={SlidersHorizontal} label="Ajustes da IA" />

            <GroupLabel>Configurações</GroupLabel>
            <NavItem icon={Palette} label="Personalização" />
            <NavItem icon={UserCog} label="Equipe" />
            <NavItem icon={Settings} label="Configurações" />
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Topbar (igual topbar.tsx) */}
          <div className="h-9 bg-white border-b border-slate-100 px-2.5 flex items-center gap-2 shrink-0">
            <div className="relative w-32">
              <Search
                size={11}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <div className="pl-6 h-6 rounded-md bg-slate-50 border border-slate-100 text-[9px] text-slate-400 flex items-center">
                Buscar conversa…
              </div>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="relative w-6 h-6 rounded-md flex items-center justify-center text-slate-500">
                <Bell size={13} />
                <span className="absolute top-0 right-0.5 w-3 h-3 rounded-full bg-red-500 text-white text-[7px] font-bold flex items-center justify-center">
                  1
                </span>
              </span>
              <div className="flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 pl-0.5 pr-2 py-0.5">
                <span className="w-5 h-5 rounded-full overflow-hidden bg-emerald-500 text-white text-[8px] font-bold flex items-center justify-center">
                  {userImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={userImage}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    userInitial
                  )}
                </span>
                <span className="text-[10px] font-medium text-slate-700 truncate max-w-20">
                  {userName || "Conta"}
                </span>
              </div>
            </div>
          </div>

          {/* Página (Dashboard de exemplo) */}
          <div className="flex-1 min-w-0 bg-slate-100 p-2.5 overflow-hidden">
            <div className="mb-2">
              <div className="text-[13px] font-bold text-slate-900 leading-tight">
                Dashboard
              </div>
              <div className="text-[9px] text-slate-500">
                Visão geral do atendimento.
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              <Metric icon={Users} value="128" label="Leads" />
              <Metric icon={MessageSquare} value="342" label="Conversas" />
              <Metric icon={Bot} value="87%" label="Resolvidas" />
            </div>
            <div className="bg-white rounded-lg border border-slate-100 p-2">
              <div className="text-[10px] font-semibold text-slate-700 mb-1.5">
                Conversa recente
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 text-slate-600 text-[9.5px] rounded-xl rounded-tl-sm px-2 py-1">
                    Oi! Vocês têm vaga?
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="bg-emerald-500 text-white text-[9.5px] rounded-xl rounded-br-sm px-2 py-1">
                    Temos sim! Quer que eu te passe os detalhes?
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
