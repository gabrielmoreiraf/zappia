import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentClient } from "@/lib/current-client";
import { getNotifications } from "@/db/panel";
import { isAdminEmail } from "@/lib/roles";
import { MobileNav, Sidebar } from "./nav";
import { Topbar } from "./topbar";

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

  const notifs = client
    ? await getNotifications(client.id)
    : { items: [], count: 0 };

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar isAdmin={isAdmin} activeClientName={client?.name ?? null} />

      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar
          hasClient={!!client}
          notifications={notifs.items}
          count={notifs.count}
          userName={user.name ?? ""}
          userEmail={user.email}
          userImage={user.image}
        />

        <main className="flex-1 p-4 sm:p-6 pb-24 md:pb-6">{children}</main>
      </div>

      <MobileNav isAdmin={isAdmin} hasActiveClient={!!client} />
    </div>
  );
}
