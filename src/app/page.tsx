import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { isAdminEmail } from "@/lib/roles";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (isAdminEmail(user.email)) redirect("/clientes"); // admin → agência
  if (!user.clientId) redirect("/bem-vindo"); // cliente sem negócio → onboarding
  redirect("/dashboard"); // cliente → painel do seu negócio
}
