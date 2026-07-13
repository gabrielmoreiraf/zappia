import { redirect } from "next/navigation";
import { Bot } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { WelcomeForm } from "./welcome-form";

export const dynamic = "force-dynamic";

export default async function BemVindoPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.isAdmin) redirect("/clientes");
  if (user.clientId) redirect("/dashboard");

  const firstName = (user.name ?? "").split(" ")[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center mb-4">
            <Bot size={28} className="text-white" />
          </div>
          <span className="text-lg font-bold text-slate-900">Zappia</span>
        </div>
        <WelcomeForm firstName={firstName} />
      </div>
    </div>
  );
}
