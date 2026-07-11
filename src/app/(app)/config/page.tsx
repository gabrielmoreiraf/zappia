import { redirect } from "next/navigation";
import { getCurrentClient } from "@/lib/current-client";
import { Header } from "../ui";
import { WhatsAppConnectionCard } from "./connect-whatsapp-button";
import { NotificationsCard } from "./notifications-card";
import { PlanCard } from "./plan-card";

export default async function ConfigPage() {
  const client = await getCurrentClient();
  if (!client) redirect("/clientes");
  const connected =
    !!client.whatsappPhoneId && !client.whatsappPhoneId.startsWith("PENDENTE");

  return (
    <div className="space-y-4">
      <Header title="Configurações" sub="Conexão, notificações e plano." />

      <WhatsAppConnectionCard connected={connected} number={client.whatsappNumber} />

      <div className="grid gap-4 lg:grid-cols-2 items-start">
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
