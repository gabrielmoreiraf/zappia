import { sweepInactive } from "@/lib/inactivity";
import { env } from "@/lib/env";

export const runtime = "nodejs";

/**
 * Encerramento por inatividade (backstop). O sweep também roda de carona no
 * webhook a cada mensagem recebida (near-real-time), então no Vercel Hobby o cron
 * pode rodar 1x/dia só como rede de segurança. Para maior frequência sem tráfego,
 * aponte um agendador externo (cron-job.org, GitHub Actions) para esta URL com o
 * header Authorization: Bearer CRON_SECRET.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${env.cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await sweepInactive();
  return Response.json({ ok: true, ...result });
}
