import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentClient } from "@/lib/current-client";
import { capsFor } from "@/lib/permissions";
import { Header } from "../ui";
import { PersonalizacaoForm } from "./personalizacao-form";

export default async function PersonalizacaoPage() {
  const user = await getCurrentUser();
  const client = await getCurrentClient();
  if (!user || !client) redirect("/clientes");
  if (!capsFor(user).branding) redirect("/dashboard");

  return (
    <div>
      <Header
        title="Personalização"
        sub="A cara do sistema pro seu negócio: logo, nome e a cor."
      />
      <PersonalizacaoForm
        name={client.name}
        logoUrl={client.logoUrl}
        brandColor={client.brandColor}
        userName={user.name ?? ""}
        userEmail={user.email}
        userImage={user.image}
      />
    </div>
  );
}
