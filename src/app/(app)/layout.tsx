import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentClient } from "@/lib/current-client";
import { getNotifications } from "@/db/panel";
import { capsFor } from "@/lib/permissions";
import { MobileNav, Sidebar } from "./nav";
import { Topbar } from "./topbar";

// O painel reflete dados ao vivo do banco, nada de HTML estático em cache.
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isAdmin = user.isAdmin;
  const caps = capsFor(user);
  const client = await getCurrentClient();
  // Cliente sem negócio ainda → onboarding.
  if (!isAdmin && !client) redirect("/bem-vindo");
  // Painel só libera com pagamento confirmado (ou vitalício). Se não descontou
  // ("overdue") ou nunca pagou, bloqueia até regularizar (ver webhook/asaas).
  if (!isAdmin && client && !client.lifetimeAccess && client.subscriptionStatus !== "active") {
    redirect("/assinar");
  }

  const notifs = client
    ? await getNotifications(client.id)
    : { items: [], count: 0 };

  return (
    <div
      className={`flex h-screen overflow-hidden bg-slate-100 ${
        client?.brandColor ? "app-theme" : ""
      }`}
      style={
        client?.brandColor
          ? ({ "--brand": client.brandColor } as React.CSSProperties)
          : undefined
      }
    >
      <Sidebar
        isAdmin={isAdmin}
        activeClientName={client?.name ?? null}
        activeClientLogo={client?.logoUrl ?? null}
        caps={caps}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar
          hasClient={!!client}
          notifications={notifs.items}
          userName={user.name ?? ""}
          userEmail={user.email}
          userImage={user.image}
        />

        {isAdmin && client && (
          <div className="shrink-0 bg-amber-50 border-b border-amber-100 px-4 sm:px-6 py-2 flex items-center gap-2 text-xs text-amber-800">
            <ShieldAlert size={14} className="shrink-0" />
            Você está vendo os dados de <strong>{client.name}</strong> como
            suporte administrativo. Esse acesso fica registrado.
          </div>
        )}

        {/* Rola dentro do main; a shell (sidebar/topbar) fica fixa. */}
        <main className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>

      <MobileNav isAdmin={isAdmin} caps={client ? caps : null} />
    </div>
  );
}
