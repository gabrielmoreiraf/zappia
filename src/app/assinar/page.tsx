import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentClient } from "@/lib/current-client";
import { AssinarView } from "./assinar-view";

export const dynamic = "force-dynamic";

/** Gate de pagamento: só sai daqui com assinatura ativa (ver (app)/layout.tsx). */
export default async function AssinarPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.isAdmin) redirect("/clientes");

  const client = await getCurrentClient();
  if (!client) redirect("/bem-vindo");

  const liberado = client.lifetimeAccess || client.subscriptionStatus === "active";
  if (liberado) redirect("/dashboard");

  return (
    <AssinarView
      clientName={client.name}
      cpfCnpj={client.cpfCnpj}
      subscriptionStatus={client.subscriptionStatus}
      lastInvoiceUrl={client.lastInvoiceUrl}
    />
  );
}
