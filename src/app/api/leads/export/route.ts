import { getCurrentClient } from "@/lib/current-client";
import { getLeads } from "@/db/panel";

export const runtime = "nodejs";

function csvCell(v: string | null | undefined): string {
  const s = (v ?? "").replace(/"/g, '""');
  return `"${s}"`;
}

export async function GET() {
  const client = await getCurrentClient();
  if (!client) {
    return new Response("Nenhum cliente ativo", { status: 400 });
  }
  const rows = await getLeads(client.id);

  const header = ["Nome", "Interesse", "Canal", "Status", "Data"];
  const lines = [header.join(",")];
  for (const l of rows) {
    lines.push(
      [
        csvCell(l.contactName),
        csvCell(l.courseInterest),
        csvCell(l.channel),
        csvCell(l.status),
        csvCell(new Date(l.createdAt).toISOString()),
      ].join(","),
    );
  }
  const csv = "﻿" + lines.join("\n"); // BOM p/ Excel abrir acentos

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-zappia.csv"`,
    },
  });
}
