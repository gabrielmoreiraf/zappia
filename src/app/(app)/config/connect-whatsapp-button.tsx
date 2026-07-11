"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCheck,
  Info,
  Loader2,
  MessageCircle,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID;
const META_WA_CONFIG_ID = process.env.NEXT_PUBLIC_META_WA_CONFIG_ID;

// Tipagem mínima do SDK do Facebook — só o que usamos aqui.
declare global {
  interface Window {
    FB?: {
      init: (opts: {
        appId: string;
        cookie?: boolean;
        xfbml?: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: { authResponse?: { code?: string } }) => void,
        opts: Record<string, unknown>,
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

let sdkLoadPromise: Promise<void> | null = null;

function loadFacebookSdk(): Promise<void> {
  if (sdkLoadPromise) return sdkLoadPromise;
  sdkLoadPromise = new Promise((resolve) => {
    if (window.FB) {
      resolve();
      return;
    }
    window.fbAsyncInit = () => {
      window.FB!.init({
        appId: META_APP_ID!,
        cookie: true,
        xfbml: false,
        version: "v21.0",
      });
      resolve();
    };
    const script = document.createElement("script");
    script.src = "https://connect.facebook.net/pt_BR/sdk.js";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    document.body.appendChild(script);
  });
  return sdkLoadPromise;
}

type Status = "idle" | "waiting-popup" | "finishing";

const STEPS = [
  { label: "Conectar com o Facebook" },
  { label: "Confirmar o número por SMS" },
  { label: "Pronto" },
];

export function WhatsAppConnectionCard({
  connected,
  number,
}: {
  connected: boolean;
  number: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [switching, setSwitching] = useState(false);
  const finishing = useRef(false);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (
        event.origin !== "https://www.facebook.com" &&
        event.origin !== "https://web.facebook.com"
      ) {
        return;
      }

      // O SDK às vezes manda o payload já como objeto, às vezes como string
      // JSON — trata os dois casos. (Log temporário pra depurar o onboarding.)
      let data: { type?: string; event?: string; data?: Record<string, string> };
      if (typeof event.data === "string") {
        try {
          data = JSON.parse(event.data);
        } catch {
          console.log("[whatsapp-connect] mensagem não-JSON ignorada:", event.data);
          return;
        }
      } else if (event.data && typeof event.data === "object") {
        data = event.data;
      } else {
        return;
      }
      console.log("[whatsapp-connect] mensagem recebida:", data);
      if (data.type !== "WA_EMBEDDED_SIGNUP") return;

      if (data.event === "FINISH" && !finishing.current) {
        finishing.current = true;
        setStatus("finishing");
        const { phone_number_id, waba_id } = data.data ?? {};
        void finishConnection(phone_number_id, waba_id);
      } else if (data.event === "CANCEL") {
        setStatus("idle");
        toast.info("Conexão cancelada.");
      } else if (data.event === "ERROR") {
        setStatus("idle");
        toast.error("A Meta reportou um erro na conexão.");
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  async function finishConnection(phoneNumberId?: string, wabaId?: string) {
    if (!phoneNumberId || !wabaId) {
      setStatus("idle");
      toast.error("A Meta não retornou os dados do número.");
      return;
    }
    try {
      const res = await fetch("/api/whatsapp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumberId, wabaId }),
      });
      const json = (await res.json()) as { number?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao conectar");
      toast.success(`WhatsApp conectado: ${json.number}`);
      setSwitching(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao conectar");
    } finally {
      setStatus("idle");
      finishing.current = false;
    }
  }

  async function connect() {
    if (!META_APP_ID || !META_WA_CONFIG_ID) {
      toast.error("Conexão com a Meta não configurada.");
      return;
    }
    setStatus("waiting-popup");
    await loadFacebookSdk();
    window.FB!.login(
      (response) => {
        console.log("[whatsapp-connect] FB.login callback:", response);
        // A confirmação de verdade (phone_number_id/waba_id) chega pelo
        // postMessage "WA_EMBEDDED_SIGNUP" tratado em onMessage acima. Se o
        // popup fechar (com ou sem autorizar) e a mensagem nunca chegar,
        // esse timeout evita ficar preso em "Aguardando o Facebook…" pra
        // sempre.
        setTimeout(() => {
          if (!finishing.current) {
            setStatus((s) => {
              if (s === "waiting-popup") {
                toast.error(
                  "A Meta não confirmou a conexão. Tente de novo — se persistir, verifique se o popup foi bloqueado.",
                );
                return "idle";
              }
              return s;
            });
          }
        }, 15000);
        if (!response.authResponse) {
          setStatus("idle");
        }
      },
      {
        config_id: META_WA_CONFIG_ID,
        response_type: "code",
        override_default_response_type: true,
        extras: { setup: {}, featureType: "", sessionInfoVersion: "3" },
      },
    );
  }

  // Já conectado e sem uma nova conexão em andamento: resumo compacto.
  if (connected && !switching) {
    return (
      <Card>
        <CardContent>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            WhatsApp
          </h3>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Phone size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-800">
                {number ?? "Número não definido"}
              </div>
              <div className="text-xs text-emerald-600 flex items-center gap-1">
                <CheckCheck size={13} /> Conectado · API oficial
              </div>
            </div>
            <Badge
              variant="outline"
              className="cursor-pointer"
              onClick={() => setSwitching(true)}
            >
              Trocar
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  const busy = status !== "idle";

  return (
    <Card className="border-emerald-100">
      <CardContent className="flex flex-col md:flex-row items-center gap-6 py-8">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <MessageCircle size={28} />
        </div>

        <div className="flex-1 min-w-0 text-center md:text-left">
          <h3 className="text-lg font-semibold text-slate-800">
            Conectar o WhatsApp
          </h3>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5 justify-center md:justify-start">
            <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
            Conecte o número oficial pela API da Meta. Sem risco de
            banimento.
          </p>

          <ol className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4 justify-center md:justify-start">
            {STEPS.map((step, i) => {
              const stepDone =
                (i === 0 && busy) || (i === 1 && status === "finishing");
              return (
                <li
                  key={step.label}
                  className="flex items-center gap-1.5 text-xs font-medium"
                >
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                      stepDone
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {stepDone ? <CheckCheck size={10} /> : i + 1}
                  </span>
                  <span className={stepDone ? "text-slate-700" : "text-slate-400"}>
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ol>

          <p className="flex items-start gap-1.5 mt-3 text-xs text-slate-400 justify-center md:justify-start">
            <Info size={13} className="shrink-0 mt-0.5" />
            O painel só mostra conversas a partir da conexão — a Meta não
            permite importar o histórico de mensagens anterior.
          </p>
        </div>

        <div className="flex flex-col items-center gap-2 shrink-0">
          <Button onClick={connect} disabled={busy}>
            {busy ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                {status === "waiting-popup"
                  ? "Aguardando o Facebook…"
                  : "Finalizando…"}
              </>
            ) : (
              "Conectar número"
            )}
          </Button>
          {switching && !busy && (
            <button
              onClick={() => setSwitching(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Cancelar
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
