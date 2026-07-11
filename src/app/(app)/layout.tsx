import { Bell, Search } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentClient } from "@/lib/current-client";
import { isAdminEmail } from "@/lib/roles";
import { MobileNav, Sidebar } from "./nav";

// O painel reflete dados ao vivo do banco — nada de HTML estático em cache.
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isAdmin = isAdminEmail(user.email);
  const client = await getCurrentClient();
  // Cliente sem negócio ainda → onboarding.
  if (!isAdmin && !client) redirect("/bem-vindo");

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar
        userName={user.name ?? ""}
        userEmail={user.email}
        userImage={user.image}
        isAdmin={isAdmin}
        activeClientName={client?.name ?? null}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* topbar mobile */}
        <div className="md:hidden bg-white px-4 pt-3 pb-2 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">Z</span>
            </div>
            <span className="font-bold text-slate-900">Zappia</span>
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <Search size={18} />
            <Bell size={18} />
          </div>
        </div>

        <main className="flex-1 p-4 sm:p-6 pb-24 md:pb-6">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>

      <MobileNav isAdmin={isAdmin} hasActiveClient={!!client} />
    </div>
  );
}
