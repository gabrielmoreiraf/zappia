import { redirect } from "next/navigation";

export default function Home() {
  // Admin cai na visão da agência; ao "entrar" num cliente, vê o painel dele.
  redirect("/clientes");
}
