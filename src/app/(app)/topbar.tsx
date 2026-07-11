"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Bot, Search, Users, Zap } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { NotificationItem } from "@/db/panel";
import { timeShort } from "@/lib/format";

export function Topbar({
  hasClient,
  notifications,
  count,
}: {
  hasClient: boolean;
  notifications: NotificationItem[];
  count: number;
}) {
  const router = useRouter();

  function onSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get("q");
    router.push(`/conversas?q=${encodeURIComponent(String(q ?? "").trim())}`);
  }

  return (
    <header className="bg-white border-b border-slate-100 px-4 py-2.5 flex items-center gap-3 sticky top-0 z-10">
      {/* logo (só mobile — desktop tem no sidebar) */}
      <Link href="/dashboard" className="md:hidden flex items-center gap-2 shrink-0">
        <span className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
          <Bot size={16} className="text-white" />
        </span>
        <span className="font-bold text-slate-900">Zappia</span>
      </Link>

      {hasClient ? (
        <>
          <form onSubmit={onSearch} className="flex-1 max-w-md relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <Input
              name="q"
              placeholder="Buscar conversa…"
              className="pl-9 h-9 bg-slate-50 border-slate-100"
            />
          </form>

          <div className="ml-auto md:ml-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="relative w-9 h-9 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-500"
                  aria-label="Notificações"
                >
                  <Bell size={18} />
                  {count > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {count}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-0">
                <div className="px-3 py-2.5 border-b border-slate-100">
                  <span className="text-sm font-semibold text-slate-800">
                    Notificações
                  </span>
                </div>
                {notifications.length === 0 ? (
                  <p className="px-3 py-6 text-sm text-slate-400 text-center">
                    Nada novo por aqui.
                  </p>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map((n) => (
                      <Link
                        key={n.id}
                        href={n.href}
                        className="flex gap-2.5 px-3 py-2.5 hover:bg-slate-50 border-b border-slate-50 last:border-0"
                      >
                        <span
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            n.type === "handoff"
                              ? "bg-amber-50 text-amber-600"
                              : "bg-emerald-50 text-emerald-600"
                          }`}
                        >
                          {n.type === "handoff" ? (
                            <Zap size={15} />
                          ) : (
                            <Users size={15} />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-slate-800 truncate">
                            {n.title}
                          </span>
                          <span className="block text-xs text-slate-400 truncate">
                            {n.sub}
                          </span>
                        </span>
                        <span className="text-[11px] text-slate-400 shrink-0">
                          {timeShort(new Date(n.at))}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      ) : (
        <div className="flex-1" />
      )}
    </header>
  );
}
