"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { saveNotifications } from "../actions";

interface Prefs {
  notificationEmail: string;
  notifyNewLead: boolean;
  notifyHandoff: boolean;
  notifyDailySummary: boolean;
}

const TOGGLES: { key: keyof Prefs; label: string }[] = [
  { key: "notifyNewLead", label: "Avisar quando um lead novo chegar" },
  { key: "notifyHandoff", label: "Avisar quando a IA encaminhar pra mim" },
  { key: "notifyDailySummary", label: "Resumo diário por e-mail" },
];

export function NotificationsCard(initial: Prefs) {
  const [prefs, setPrefs] = useState<Prefs>(initial);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  function toggle(key: keyof Prefs) {
    setSaved(false);
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  }

  function save() {
    const fd = new FormData();
    fd.set("notificationEmail", prefs.notificationEmail);
    if (prefs.notifyNewLead) fd.set("notifyNewLead", "on");
    if (prefs.notifyHandoff) fd.set("notifyHandoff", "on");
    if (prefs.notifyDailySummary) fd.set("notifyDailySummary", "on");
    start(async () => {
      await saveNotifications(fd);
      setSaved(true);
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-1">Notificações</h3>
      <p className="text-xs text-slate-400 mb-3">
        E-mail que recebe os avisos e o resumo.
      </p>

      <input
        type="email"
        value={prefs.notificationEmail}
        onChange={(e) => {
          setSaved(false);
          setPrefs((p) => ({ ...p, notificationEmail: e.target.value }));
        }}
        placeholder="seu@email.com"
        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-400 mb-2"
      />

      {TOGGLES.map((tg, i) => (
        <div
          key={tg.key}
          className={`flex items-center justify-between py-2.5 ${
            i < TOGGLES.length - 1 ? "border-b border-slate-50" : ""
          }`}
        >
          <span className="text-sm text-slate-600">{tg.label}</span>
          <button
            type="button"
            onClick={() => toggle(tg.key)}
            aria-label={tg.label}
            className={`w-10 h-6 rounded-full flex items-center px-0.5 transition-colors ${
              prefs[tg.key] ? "bg-emerald-500 justify-end" : "bg-slate-200 justify-start"
            }`}
          >
            <div className="w-5 h-5 rounded-full bg-white" />
          </button>
        </div>
      ))}

      <button
        onClick={save}
        disabled={pending}
        className="mt-4 px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-sm flex items-center gap-1.5 disabled:opacity-50"
      >
        <Check size={16} /> {saved ? "Salvo!" : "Salvar notificações"}
      </button>
    </div>
  );
}
