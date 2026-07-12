import { redirect } from "next/navigation";
import { getCurrentClient } from "@/lib/current-client";
import { getCurrentUser } from "@/lib/current-user";
import { capsFor } from "@/lib/permissions";
import { Header } from "../ui";
import { WhatsAppConnectionCard } from "./whatsapp-connect-card";
import { NotificationsCard } from "./notifications-card";
import { PlanCard } from "./plan-card";

export default async function ConfigPage() {
  const user = await getCurrentUser();
  const client = await getCurrentClient();
  if (!user || !client) redirect("/clientes");
  if (!capsFor(user).config) redirect("/dashboard");
  const connected =
    !!client.whatsappPhoneId && !client.whatsappPhoneId.startsWith("PENDENTE");
  const requested = !connected && !!client.whatsappRequestedAt;

  return (
    <div className="space-y-4">
      <Header title="Configurações" sub="Conexão, notificações e plano." />

      <WhatsAppConnectionCard
        connected={connected}
        number={client.whatsappNumber}
        requested={requested}
      />

      <div className="grid gap-4 lg:grid-cols-2 items-stretch">
        <PlanCard />

        <NotificationsCard
          notificationEmail={client.notificationEmail ?? client.ownerEmail ?? ""}
          notifyNewLead={client.notifyNewLead}
          notifyHandoff={client.notifyHandoff}
          notifyDailySummary={client.notifyDailySummary}
        />
      </div>
    </div>
  );
}
