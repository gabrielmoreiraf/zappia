"use client";

import { useState, useTransition } from "react";
import { Check, Plus } from "lucide-react";
import { saveAjustes } from "../actions";

const TONES = ["Amigável", "Neutro", "Formal"];

export function AjustesForm({
  assistantName,
  welcomeMessage,
  tone,
  triggers,
}: {
  assistantName: string;
  welcomeMessage: string;
  tone: string;
  triggers: string[];
}) {
  const [selTone, setSelTone] = useState(tone || "Amigável");
  const [tags, setTags] = useState<string[]>(triggers);
  const [newTag, setNewTag] = useState("");
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  function addTag() {
    const t = newTag.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setNewTag("");
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("tone", selTone);
    fd.set("handoffTriggers", tags.join(","));
    start(async () => {
      await saveAjustes(fd);
      setSaved(true);
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      onChange={() => setSaved(false)}
      className="bg-white rounded-2xl border border-slate-200 p-5 max-w-xl"
    >
      <Field label="Nome do assistente">
        <input
          name="assistantName"
          defaultValue={assistantName}
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none"
        />
      </Field>

      <Field label="Mensagem de boas-vindas">
        <textarea
          name="welcomeMessage"
          rows={3}
          defaultValue={welcomeMessage}
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none resize-none"
        />
      </Field>

      <Field label="Tom da conversa">
        <div className="flex gap-2">
          {TONES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setSelTone(t);
                setSaved(false);
              }}
              className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                selTone === t
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "border-slate-200 text-slate-500"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Encaminhar pra você quando o cliente disser">
        <div className="flex flex-wrap gap-2 items-center">
          {tags.map((t) => (
            <span
              key={t}
              className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 flex items-center gap-1"
            >
              {t}
              <button
                type="button"
                onClick={() => {
                  setTags(tags.filter((x) => x !== t));
                  setSaved(false);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </span>
          ))}
          <span className="flex items-center gap-1">
            <input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="add"
              className="text-xs px-2.5 py-1 rounded-full border border-dashed border-slate-300 outline-none w-20"
            />
            <button
              type="button"
              onClick={addTag}
              className="text-slate-400"
              aria-label="Adicionar gatilho"
            >
              <Plus size={14} />
            </button>
          </span>
        </div>
      </Field>

      <button
        type="submit"
        disabled={pending}
        className="mt-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-sm flex items-center gap-1.5 disabled:opacity-50"
      >
        <Check size={16} /> {saved ? "Salvo!" : "Salvar ajustes"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="text-sm font-medium text-slate-700 block mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
