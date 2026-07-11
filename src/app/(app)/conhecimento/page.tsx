import { redirect } from "next/navigation";
import { getCurrentClient } from "@/lib/current-client";
import { parseKnowledgeBase } from "@/lib/knowledge-base";
import { Header } from "../ui";
import { KnowledgeManager } from "./knowledge-manager";

export default async function ConhecimentoPage() {
  const client = await getCurrentClient();
  if (!client) redirect("/clientes");
  const items = parseKnowledgeBase(client.knowledgeBase);

  return (
    <div>
      <Header
        title="Base de conhecimento"
        sub="É isso que a IA sabe sobre o negócio. Adicione produtos, serviços ou informações."
      />
      <KnowledgeManager courses={items} />
    </div>
  );
}
