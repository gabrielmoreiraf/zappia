import { redirect } from "next/navigation";

export default function Home() {
  // Fase 5 troca por: sessão? → /dashboard : /login
  redirect("/dashboard");
}
