"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

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

export function ConnectWhatsAppButton({ connected }: { connected: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const finishing = useRef(false);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (
        event.origin !== "https://www.facebook.com" &&
        event.origin !== "https://web.facebook.com"
      ) {
        return;
      }
      let data: { type?: string; event?: string; data?: Record<string, string> };
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      if (data.type !== "WA_EMBEDDED_SIGNUP") return;

      if (data.event === "FINISH" && !finishing.current) {
        finishing.current = true;
        const { phone_number_id, waba_id } = data.data ?? {};
        void finishConnection(phone_number_id, waba_id);
      } else if (data.event === "CANCEL") {
        setLoading(false);
        toast.info("Conexão cancelada.");
      } else if (data.event === "ERROR") {
        setLoading(false);
        toast.error("A Meta reportou um erro na conexão.");
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  async function finishConnection(phoneNumberId?: string, wabaId?: string) {
    if (!phoneNumberId || !wabaId) {
      setLoading(false);
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
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao conectar");
    } finally {
      setLoading(false);
      finishing.current = false;
    }
  }

  async function connect() {
    if (!META_APP_ID || !META_WA_CONFIG_ID) {
      toast.error("Conexão com a Meta não configurada.");
      return;
    }
    setLoading(true);
    await loadFacebookSdk();
    window.FB!.login(
      (response) => {
        // A confirmação de verdade (phone_number_id/waba_id) chega pelo
        // postMessage "WA_EMBEDDED_SIGNUP" tratado em onMessage acima.
        if (!response.authResponse) {
          setLoading(false);
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

  return (
    <Badge
      variant={connected ? "outline" : "secondary"}
      className={`cursor-pointer ${connected ? "" : "bg-amber-100 text-amber-700"}`}
      onClick={loading ? undefined : connect}
    >
      {loading ? (
        <Loader2 size={12} className="animate-spin" />
      ) : connected ? (
        "Trocar"
      ) : (
        "Conectar"
      )}
    </Badge>
  );
}
