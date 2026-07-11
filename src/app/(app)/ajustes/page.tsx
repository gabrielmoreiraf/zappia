import { getCurrentClient } from "@/lib/current-client";
import { Header } from "../ui";
import { AjustesForm } from "./ajustes-form";

export default async function AjustesPage() {
  const client = await getCurrentClient();
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
      />
    </div>
  );
}
