import { getCurrentClient } from "@/lib/current-client";
import { getCurrentUser } from "@/lib/current-user";
import { capsFor } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Header } from "../ui";
import { AjustesForm } from "./ajustes-form";

export default async function AjustesPage() {
  const user = await getCurrentUser();
  const client = await getCurrentClient();
  if (!user || !client) redirect("/clientes");
  if (!capsFor(user).ai) redirect("/dashboard");
  return (
    <div>
      <Header
        title="Ajustes da IA"
        sub="Personalidade, boas-vindas e quando chamar você."
      />
      <AjustesForm
        assistantName={client.assistantName ?? ""}
        welcomeMessage={client.welcomeMessage ?? ""}
        tone={client.tone}
        triggers={client.handoffTriggers ?? []}
        waitingMessage={client.waitingMessage}
        closingMessage={client.closingMessage}
        inactivityMinutes={client.inactivityMinutes}
        reengageLeadsEnabled={client.reengageLeadsEnabled}
        reengagementMessage={client.reengagementMessage}
      />
    </div>
  );
}
