import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentClient } from "@/lib/current-client";
import { isAdminEmail } from "@/lib/roles";
import { Header } from "../ui";
import { PersonalizacaoForm } from "./personalizacao-form";

export default async function PersonalizacaoPage() {
  const user = await getCurrentUser();
  const client = await getCurrentClient();
  if (!user || !client) redirect("/clientes");
  // Só o dono (master) ou o admin da agência personalizam a marca.
  const canManage = isAdminEmail(user.email) || user.role === "owner";
  if (!canManage) redirect("/dashboard");

  return (
    <div>
      <Header
        title="Personalização"
        sub="A cara do sistema pro seu negócio: logo, nome e (em breve) a cor."
      />
      <PersonalizacaoForm
        name={client.name}
        logoUrl={client.logoUrl}
        brandColor={client.brandColor}
      />
    </div>
  );
}
