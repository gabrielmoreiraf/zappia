import { redirect } from "next/navigation";
import { getCurrentClient } from "@/lib/current-client";
import { getCurrentUser } from "@/lib/current-user";
import { capsFor } from "@/lib/permissions";
import { Header } from "../ui";
import { WhatsAppConnectionCard } from "./whatsapp-connect-card";
import { NotificationsCard } from "./notifications-card";
import { PlanCard } from "./plan-card";
import { WhatsappProfileCard } from "./whatsapp-profile-card";
import { loadWhatsappProfile } from "./whatsapp-profile-actions";
import { BusinessHoursCard } from "./business-hours-card";
import { parseBusinessHours } from "@/lib/business-hours";

export default async function ConfigPage() {
  const user = await getCurrentUser();
  const client = await getCurrentClient();
  if (!user || !client) redirect("/clientes");
  if (!capsFor(user).config) redirect("/dashboard");
  const connected =
    !!client.whatsappPhoneId && !client.whatsappPhoneId.startsWith("PENDENTE");
  const requested = !connected && !!client.whatsappRequestedAt;
  const whatsappProfile = connected ? await loadWhatsappProfile() : null;

  return (
    <div className="space-y-4">
      <Header title="Configurações" sub="Conexão, notificações e plano." />

      <WhatsAppConnectionCard
        connected={connected}
        number={client.whatsappNumber}
        requested={requested}
      />

      {whatsappProfile && <WhatsappProfileCard profile={whatsappProfile} />}

      <BusinessHoursCard
        enabled={client.businessHoursEnabled}
        hours={parseBusinessHours(client.businessHours)}
        outOfHoursMessage={client.outOfHoursMessage}
      />

      <div className="grid gap-4 lg:grid-cols-2 items-stretch">
        <PlanCard
          subscriptionStatus={client.subscriptionStatus}
          subscriptionDueDate={client.subscriptionDueDate}
          paymentMethod={client.paymentMethod}
          lastInvoiceUrl={client.lastInvoiceUrl}
          cpfCnpj={client.cpfCnpj}
        />

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
