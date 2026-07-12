import { redirect } from "next/navigation";
import { getCurrentClient } from "@/lib/current-client";
import { getCurrentUser } from "@/lib/current-user";
import { capsFor } from "@/lib/permissions";
import { parseKnowledgeBase } from "@/lib/knowledge-base";
import { Header } from "../ui";
import { KnowledgeManager } from "./knowledge-manager";
import { SmartAdd } from "./smart-add";
import { TestChat } from "./test-chat";

export default async function ConhecimentoPage() {
  const user = await getCurrentUser();
  const client = await getCurrentClient();
  if (!user || !client) redirect("/clientes");
  if (!capsFor(user).ai) redirect("/dashboard");
  const items = parseKnowledgeBase(client.knowledgeBase);

  return (
    <div>
      <Header
        title="Base de conhecimento"
        sub="É isso que a IA sabe sobre o negócio. Treine ela aqui — e teste na hora."
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <SmartAdd />
          <KnowledgeManager courses={items} />
        </div>
        {/* Coluna estica na altura toda; o wrapper interno é o sticky de fato. */}
        <div>
          <div className="lg:sticky lg:top-6">
            <TestChat />
          </div>
        </div>
      </div>
    </div>
  );
}
