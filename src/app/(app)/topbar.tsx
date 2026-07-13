"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Bell,
  Bot,
  CreditCard,
  LogOut,
  Search,
  Settings,
  Users,
  X,
  Zap,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { NotificationItem } from "@/db/panel";
import { timeShort } from "@/lib/format";
import { clearNotifications, dismissNotification } from "./notification-actions";

function initialsOf(name: string, email: string) {
  return (name || email).charAt(0).toUpperCase();
}

export function Topbar({
  hasClient,
  notifications,
  userName,
  userEmail,
  userImage,
}: {
  hasClient: boolean;
  notifications: NotificationItem[];
  userName: string;
  userEmail: string;
  userImage?: string | null;
}) {
  const router = useRouter();
  const [items, setItems] = useState(notifications);
  useEffect(() => setItems(notifications), [notifications]);

  // Notificações são eventos reais (lead, handoff, fatura): faz polling pra
  // aparecer sem precisar recarregar a página.
  useEffect(() => {
    if (!hasClient) return;
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { items: NotificationItem[] };
        setItems(data.items);
      } catch {
        // silencioso, tenta de novo no próximo ciclo
      }
    }, 15000);
    return () => clearInterval(id);
  }, [hasClient]);

  function onSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get("q");
    router.push(`/conversas?q=${encodeURIComponent(String(q ?? "").trim())}`);
  }

  function dismiss(key: string) {
    setItems((prev) => prev.filter((n) => n.id !== key));
    void dismissNotification(key);
  }
  function clearAll() {
    void clearNotifications(items.map((n) => n.id));
    setItems([]);
  }

  return (
    <header className="h-16 shrink-0 bg-white border-b border-slate-100 px-4 flex items-center gap-3 sticky top-0 z-10">
      <Link href="/dashboard" className="md:hidden flex items-center gap-2 shrink-0">
        <span className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
          <Bot size={16} className="text-white" />
        </span>
        <span className="font-bold text-slate-900">Zappia</span>
      </Link>

      {hasClient && (
        <form onSubmit={onSearch} className="w-full max-w-xs min-w-0 relative">
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
      )}

      <div className="ml-auto flex items-center gap-1">
        {hasClient && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="relative w-9 h-9 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-500"
                aria-label="Notificações"
              >
                <Bell size={18} />
                {items.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {items.length}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
              <div className="px-3 py-2.5 border-b border-slate-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800">
                  Notificações
                </span>
                {items.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                  >
                    Limpar todos
                  </button>
                )}
              </div>
              {items.length === 0 ? (
                <p className="px-3 py-6 text-sm text-slate-400 text-center">
                  Nada novo por aqui.
                </p>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  {items.map((n) => (
                    <div
                      key={n.id}
                      className="group flex items-center gap-1 pr-2 hover:bg-slate-50 border-b border-slate-50 last:border-0"
                    >
                      <Link href={n.href} className="flex gap-2.5 px-3 py-2.5 flex-1 min-w-0">
                        <span
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            n.type === "handoff"
                              ? "bg-amber-50 text-amber-600"
                              : n.type === "lead"
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-red-50 text-red-600"
                          }`}
                        >
                          {n.type === "handoff" ? (
                            <Zap size={15} />
                          ) : n.type === "lead" ? (
                            <Users size={15} />
                          ) : (
                            <CreditCard size={15} />
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
                      <button
                        onClick={() => dismiss(n.id)}
                        aria-label="Dispensar"
                        className="w-6 h-6 rounded-md flex items-center justify-center text-slate-300 hover:text-slate-600 hover:bg-slate-100 shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Menu da conta */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 pl-1 pr-3 py-1 transition-colors">
              <Avatar className="size-7 shrink-0">
                {userImage && (
                  <AvatarImage
                    src={userImage}
                    alt={userName}
                    className="object-cover"
                  />
                )}
                <AvatarFallback className="bg-emerald-500 text-white text-xs font-bold">
                  {initialsOf(userName, userEmail)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-sm font-medium text-slate-700 max-w-32 truncate">
                {userName || "Conta"}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="font-medium truncate">{userName || "Minha conta"}</div>
              <div className="text-xs text-slate-400 font-normal truncate">
                {userEmail}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/perfil">
                <Settings size={15} /> Configurações da conta
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-red-600 focus:text-red-600"
            >
              <LogOut size={15} /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
