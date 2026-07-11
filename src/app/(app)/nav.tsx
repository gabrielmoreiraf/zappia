"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  BookOpen,
  SlidersHorizontal,
  Settings,
  Bot,
  LogOut,
  Building2,
  Wallet,
  ChevronLeft,
  Store,
  type LucideIcon,
} from "lucide-react";
import { exitClient } from "./agency-actions";

type Item = { href: string; label: string; icon: LucideIcon };

const CLIENT_ITEMS: Item[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/conversas", label: "Conversas", icon: MessageSquare },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/conhecimento", label: "Base de conhecimento", icon: BookOpen },
  { href: "/ajustes", label: "Ajustes da IA", icon: SlidersHorizontal },
  { href: "/config", label: "Configurações", icon: Settings },
];

const AGENCY_ITEMS: Item[] = [
  { href: "/clientes", label: "Clientes", icon: Building2 },
  { href: "/faturamento", label: "Faturamento", icon: Wallet },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center">
        <Bot size={18} className="text-white" />
      </div>
      <span className="font-bold text-lg text-slate-900">Zappia</span>
    </div>
  );
}

function NavLink({ item, pathname }: { item: Item; pathname: string }) {
  const Ic = item.icon;
  const on = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium mb-0.5 ${
        on ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50"
      }`}
    >
      <Ic size={17} /> {item.label}
    </Link>
  );
}

export function Sidebar({
  userName,
  userEmail,
  userImage,
  isAdmin,
  activeClientName,
}: {
  userName: string;
  userEmail: string;
  userImage?: string | null;
  isAdmin: boolean;
  activeClientName: string | null;
}) {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex w-60 shrink-0 bg-white border-r border-slate-200 p-3 flex-col h-screen sticky top-0">
      <div className="px-2 py-2 mb-2">
        <Logo />
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto">
        {/* Painel do cliente ativo */}
        {activeClientName && (
          <div>
            <div className="flex items-center gap-2 px-2 py-2 mb-1.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <Store size={15} />
              </span>
              <span className="text-sm font-semibold text-slate-800 truncate flex-1">
                {activeClientName}
              </span>
              {isAdmin && (
                <form action={exitClient}>
                  <button
                    type="submit"
                    title="Voltar para a agência"
                    className="text-slate-400 hover:text-emerald-600 flex items-center"
                  >
                    <ChevronLeft size={16} />
                  </button>
                </form>
              )}
            </div>
            {CLIENT_ITEMS.map((it) => (
              <NavLink key={it.href} item={it} pathname={pathname} />
            ))}
          </div>
        )}

        {/* Agência (só admin) */}
        {isAdmin && (
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide px-2 mb-1">
              Agência
            </div>
            {AGENCY_ITEMS.map((it) => (
              <NavLink key={it.href} item={it} pathname={pathname} />
            ))}
          </div>
        )}
      </nav>

      <div className="mt-3 flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50">
        <Link
          href="/perfil"
          className="flex items-center gap-2.5 min-w-0 flex-1 group"
        >
          <span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold overflow-hidden shrink-0">
            {userImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={userImage}
                alt={userName}
                className="w-full h-full object-cover"
              />
            ) : (
              (userName || userEmail).charAt(0).toUpperCase()
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-800 truncate group-hover:text-emerald-700">
              {userName || "Minha conta"}
            </span>
            <span className="block text-xs text-slate-400 truncate">
              {userEmail}
            </span>
          </span>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          aria-label="Sair"
          className="text-slate-400 hover:text-slate-600 shrink-0"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}

export function MobileNav({
  isAdmin,
  hasActiveClient,
}: {
  isAdmin: boolean;
  hasActiveClient: boolean;
}) {
  const pathname = usePathname();
  const items: Item[] = hasActiveClient
    ? [
        { href: "/dashboard", label: "Início", icon: LayoutDashboard },
        { href: "/conversas", label: "Conversas", icon: MessageSquare },
        { href: "/leads", label: "Leads", icon: Users },
        { href: "/conhecimento", label: "Base", icon: BookOpen },
        { href: "/config", label: "Config", icon: Settings },
      ]
    : isAdmin
      ? [
          { href: "/clientes", label: "Clientes", icon: Building2 },
          { href: "/faturamento", label: "Faturamento", icon: Wallet },
          { href: "/perfil", label: "Perfil", icon: Users },
        ]
      : [];

  if (items.length === 0) return null;

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t border-slate-200 flex justify-around px-1 py-1.5">
      {items.map((t) => {
        const Ic = t.icon;
        const on = isActive(pathname, t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg ${
              on ? "text-emerald-600" : "text-slate-400"
            }`}
          >
            <Ic size={20} />
            <span className="text-[10px] font-medium">{t.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
