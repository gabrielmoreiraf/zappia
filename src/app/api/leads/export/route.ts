import { getCurrentClient } from "@/lib/current-client";
import { getCurrentUser } from "@/lib/current-user";
import { getLeads, getLeadsByIds } from "@/db/panel";
import { buildBrandedTablePdf } from "@/lib/pdf-export";
import { LEAD_STATUS } from "@/app/(app)/ui";

export const runtime = "nodejs";

const CHANNEL_LABEL: Record<string, string> = {
  anuncio: "Anúncio",
  organico: "Orgânico",
};

const STATUS_FILTER_LABEL: Record<string, string> = {
  novo: "Novos",
  contato: "Em contato",
  matriculado: "Convertidos",
};

export async function GET(req: Request) {
  const [client, user] = await Promise.all([getCurrentClient(), getCurrentUser()]);
  if (!client) {
    return new Response("Nenhum cliente ativo", { status: 400 });
  }

  const url = new URL(req.url);
  const idsParam = url.searchParams.get("ids");
  const st = url.searchParams.get("st") ?? "";

  let leads;
  let subtitle: string;
  if (idsParam) {
    const ids = idsParam.split(",").filter(Boolean);
    leads = await getLeadsByIds(client.id, ids);
    subtitle = `${leads.length} lead${leads.length === 1 ? "" : "s"} selecionado${leads.length === 1 ? "" : "s"}`;
  } else {
    const status =
      st === "novo" || st === "contato" || st === "matriculado" ? st : undefined;
    leads = await getLeads(client.id, status);
    subtitle = status
      ? `${leads.length} lead${leads.length === 1 ? "" : "s"} · filtro: ${STATUS_FILTER_LABEL[status]}`
      : `${leads.length} contato${leads.length === 1 ? "" : "s"} capturado${leads.length === 1 ? "" : "s"} pela IA`;
  }

  const pdf = await buildBrandedTablePdf({
    title: "Leads",
    subtitle,
    clientName: client.name,
    clientLogoDataUrl: client.logoUrl,
    exportedByName: user?.name ?? "Usuário",
    exportedByEmail: user?.email ?? "-",
    columns: [
      { label: "Nome", width: 100 },
      { label: "Interesse", width: 115 },
      { label: "Canal", width: 60 },
      { label: "Campanha", width: 100 },
      { label: "Status", width: 65 },
      { label: "Data", width: 60 },
    ],
    rows: leads.map((l) => [
      l.contactName ?? "-",
      l.courseInterest ?? "-",
      CHANNEL_LABEL[l.channel] ?? l.channel,
      // Só anúncio tem campanha; orgânico fica "-" em vez de vazio.
      l.referralHeadline ?? "-",
      LEAD_STATUS[l.status]?.label ?? l.status,
      new Date(l.createdAt).toLocaleDateString("pt-BR"),
    ]),
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="leads-${client.name.toLowerCase().replace(/\s+/g, "-")}.pdf"`,
    },
  });
}
