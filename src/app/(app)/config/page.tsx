import { CheckCheck, Phone } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentClient } from "@/lib/current-client";
import { PLAN_NAME, PLAN_PRICE_LABEL } from "@/lib/plan";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "../ui";
import { NotificationsCard } from "./notifications-card";

export default async function ConfigPage() {
  const client = await getCurrentClient();
  if (!client) redirect("/clientes");
  const connected =
    !!client.whatsappPhoneId && !client.whatsappPhoneId.startsWith("PENDENTE");

  return (
    <div>
      <Header title="Configurações" sub="Conexão, notificações e plano." />
      <div className="grid gap-4 lg:grid-cols-2 items-start">
        {/* Coluna esquerda: WhatsApp + Plano empilhados */}
        <div className="space-y-4">
          <Card>
            <CardContent>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                WhatsApp
              </h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Phone size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-800">
                    {client.whatsappNumber ?? "Número não definido"}
                  </div>
                  {connected ? (
                    <div className="text-xs text-emerald-600 flex items-center gap-1">
                      <CheckCheck size={13} /> Conectado · API oficial
                    </div>
                  ) : (
                    <div className="text-xs text-amber-600">
                      Aguardando conexão (Meta)
                    </div>
                  )}
                </div>
                <Badge
                  variant={connected ? "outline" : "secondary"}
                  className={connected ? "" : "bg-amber-100 text-amber-700"}
                >
                  {connected ? "Trocar" : "Conectar"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-700">
                  Plano {PLAN_NAME}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {PLAN_PRICE_LABEL}/mês
                </p>
              </div>
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
                Gerenciar
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Coluna direita: Notificações */}
        <NotificationsCard
          notificationEmail={client.notificationEmail ?? client.ownerEmail ?? ""}
          notifyNewLead={client.notifyNewLead}
          notifyHandoff={client.notifyHandoff}
          notifyDailySummary={client.notifyDailySummary}
        />
      </div>
    </div>
  );
}
