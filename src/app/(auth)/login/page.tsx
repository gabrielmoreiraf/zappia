import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <Suspense fallback={<div className="text-center text-sm text-slate-400">Carregando…</div>}>
      <LoginForm />
    </Suspense>
  );
}
