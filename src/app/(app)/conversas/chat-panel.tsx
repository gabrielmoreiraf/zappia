"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  Download,
  FileText,
  Mic,
  Paperclip,
  Send,
  Sparkles,
  Users,
  Wand2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { WhatsappFormatToolbar } from "@/components/whatsapp-format-toolbar";
import { WhatsappText } from "@/components/whatsapp-text";
import {
  assumirConversa,
  devolverParaIA,
  sendMediaReply,
  sendReply,
  suggestReplyImprovement,
} from "../actions";
import { initials, timeShort } from "@/lib/format";

const MAX_MEDIA_BYTES = 10 * 1024 * 1024; // 10MB, bate com o limite do servidor

export interface ChatMessage {
  id: string;
  from: "them" | "bot" | "you";
  text: string;
  isAudio: boolean;
  mediaUrl?: string | null;
  mediaType?: string | null;
  mediaFilename?: string | null;
  createdAt: string | Date;
}

export interface ChatConversation {
  id: string;
  contactName: string | null;
  status: "ia" | "novo" | "voce";
}

export interface QuickReplyItem {
  id: string;
  shortcut: string;
  message: string;
}

export function ChatPanel({
  conversation,
  messages,
  quickReplies = [],
  onChanged,
}: {
  conversation: ChatConversation;
  messages: ChatMessage[];
  quickReplies?: QuickReplyItem[];
  onChanged?: () => void | Promise<void>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [improving, startImproving] = useTransition();
  const [draft, setDraft] = useState("");
  const [uploadingFile, startUpload] = useTransition();
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll pro final quando chega mensagem nova (ou troca de conversa).
  const lastMessageId = messages[messages.length - 1]?.id;
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastMessageId]);

  // "/" no começo do texto abre o menu de respostas rápidas, como no WhatsApp
  // Business. Filtra pelo que vem depois da barra.
  const shortcutQuery =
    draft.startsWith("/") && !draft.includes(" ") ? draft.slice(1).toLowerCase() : null;
  const shortcutMatches = useMemo(() => {
    if (shortcutQuery === null) return [];
    return quickReplies.filter((q) => q.shortcut.toLowerCase().startsWith(shortcutQuery));
  }, [shortcutQuery, quickReplies]);
  const showShortcuts = shortcutQuery !== null && shortcutMatches.length > 0;

  function pickShortcut(msg: string) {
    setDraft(msg);
    inputRef.current?.focus();
  }

  const statusLine =
    conversation.status === "voce"
      ? "Você está atendendo"
      : conversation.status === "novo"
        ? "Encaminhada pra você"
        : "IA respondendo";

  function assumir() {
    start(async () => {
      await assumirConversa(conversation.id);
      await onChanged?.();
    });
  }
  function devolver() {
    start(async () => {
      await devolverParaIA(conversation.id);
      await onChanged?.();
    });
  }
  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    start(async () => {
      await sendReply(conversation.id, text);
      await onChanged?.();
    });
  }
  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    if (!isImage && !isPdf) {
      toast.error("Só é possível anexar imagem ou PDF.");
      return;
    }
    if (file.size > MAX_MEDIA_BYTES) {
      toast.error("Arquivo muito grande (máximo 10MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      startUpload(async () => {
        const res = await sendMediaReply(conversation.id, dataUrl, file.name);
        if (res.ok) {
          await onChanged?.();
        } else {
          toast.error(res.error ?? "Não foi possível enviar o arquivo.");
        }
      });
    };
    reader.readAsDataURL(file);
  }

  function sugerirMelhoria() {
    const text = draft.trim();
    if (!text) return;
    startImproving(async () => {
      const res = await suggestReplyImprovement(text);
      if (res.ok && res.text) {
        setDraft(res.text);
      } else {
        toast.error(res.error ?? "Não foi possível sugerir agora.");
      }
    });
  }

  return (
    <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            className="md:hidden"
            onClick={() => router.push("/conversas")}
            aria-label="Voltar"
          >
            <ArrowLeft size={18} className="text-slate-500" />
          </button>
          <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-sm font-semibold">
            {initials(conversation.contactName)}
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-800">
              {conversation.contactName ?? "Contato"}
            </div>
            <div className="text-xs text-emerald-600 flex items-center gap-1">
              <Bot size={12} /> {statusLine}
            </div>
          </div>
        </div>
        {conversation.status === "voce" ? (
          <Button
            onClick={devolver}
            disabled={pending}
            size="sm"
            className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          >
            <Sparkles size={13} /> Devolver pra IA
          </Button>
        ) : (
          <Button
            onClick={assumir}
            disabled={pending}
            size="sm"
            className="bg-sky-50 text-sky-700 hover:bg-sky-100"
          >
            <Users size={13} /> Assumir
          </Button>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50"
      >
        {messages.map((m) => {
          const mine = m.from === "bot" || m.from === "you";
          const isYou = m.from === "you";
          return (
            <div
              key={m.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${
                  isYou
                    ? "bg-sky-500 text-white"
                    : mine
                      ? "bg-emerald-500 text-white"
                      : "bg-white border border-slate-200 text-slate-700"
                }`}
              >
                {m.isAudio && (
                  <div
                    className={`flex items-center gap-1.5 mb-1 text-[11px] ${
                      mine ? "text-emerald-50" : "text-emerald-600"
                    }`}
                  >
                    <Mic size={12} /> áudio transcrito
                  </div>
                )}
                {isYou && (
                  <div className="text-[11px] text-sky-100 mb-0.5">Você</div>
                )}
                {m.mediaType === "image" && m.mediaUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.mediaUrl}
                    alt="Imagem enviada"
                    className="max-w-full max-h-64 rounded-lg cursor-zoom-in mb-1"
                    onClick={() => setViewingImage(m.mediaUrl!)}
                  />
                )}
                {m.mediaType === "document" && m.mediaUrl && (
                  <a
                    href={m.mediaUrl}
                    download={m.mediaFilename ?? "arquivo.pdf"}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-2 mb-1 text-xs font-medium ${
                      mine ? "bg-black/10" : "bg-slate-50 border border-slate-200"
                    }`}
                  >
                    <FileText size={16} className="shrink-0" />
                    <span className="truncate flex-1">{m.mediaFilename ?? "Documento"}</span>
                    <Download size={13} className="shrink-0" />
                  </a>
                )}
                {m.text && (
                  <span className="whitespace-pre-wrap">
                    <WhatsappText text={m.text} />
                  </span>
                )}
                <div
                  className={`text-[10px] mt-1 ${mine ? "text-white/70" : "text-slate-400"}`}
                >
                  {timeShort(new Date(m.createdAt))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form
        onSubmit={enviar}
        className="p-3 border-t border-slate-100 relative"
      >
        {showShortcuts && (
          <div className="absolute bottom-full left-3 right-3 mb-1.5 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto z-10">
            {shortcutMatches.map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => pickShortcut(q.message)}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-start gap-2 border-b border-slate-50 last:border-b-0"
              >
                <Zap size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-700">
                    /{q.shortcut}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    <WhatsappText text={q.message} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between mb-1.5 px-0.5">
          <WhatsappFormatToolbar
            value={draft}
            onChange={setDraft}
            targetRef={inputRef}
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={onPickFile}
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFile}
            aria-label="Anexar imagem ou PDF"
            title="Anexar imagem ou PDF"
          >
            <Paperclip size={16} className={uploadingFile ? "animate-pulse" : ""} />
          </Button>
          <Input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder='Escreva pra assumir a conversa… ("/" pra respostas rápidas)'
            className="flex-1"
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={sugerirMelhoria}
            disabled={improving || !draft.trim()}
            aria-label="Sugerir melhoria no texto"
            title="Sugerir melhoria no texto"
          >
            <Wand2 size={16} className={improving ? "animate-pulse" : ""} />
          </Button>
          <Button type="submit" size="icon" disabled={pending || !draft.trim()}>
            <Send size={17} />
          </Button>
        </div>
      </form>

      <Dialog open={!!viewingImage} onOpenChange={(o) => !o && setViewingImage(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogTitle className="sr-only">Imagem</DialogTitle>
          {viewingImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={viewingImage} alt="" className="w-full rounded-xl" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
