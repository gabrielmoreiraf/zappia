import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { getCurrentClient } from "@/lib/current-client";
import {
  getDisplayPhoneNumber,
  registerPhoneNumber,
  subscribeApp,
} from "@/lib/whatsapp";

export const runtime = "nodejs";

/**
 * Finaliza o Embedded Signup: recebe o phone_number_id/waba_id que a Meta
 * devolveu no popup, assina o app na WABA do cliente e registra o número na
 * Cloud API. Depois disso o número já responde pelo pipeline normal.
 */
export async function POST(req: Request) {
  const client = await getCurrentClient();
  if (!client) {
    return Response.json({ error: "Nenhum cliente ativo" }, { status: 400 });
  }

  const body = (await req.json()) as {
    phoneNumberId?: string;
    wabaId?: string;
  };
  const { phoneNumberId, wabaId } = body;
  if (!phoneNumberId || !wabaId) {
    return Response.json({ error: "Dados incompletos" }, { status: 400 });
  }

  try {
    await subscribeApp(wabaId);
    // PIN de verificação em duas etapas exigido pela Cloud API; não é usado
    // pelo cliente no dia a dia (a conta é gerenciada só por nós).
    await registerPhoneNumber(phoneNumberId, "184729");
    const displayNumber = await getDisplayPhoneNumber(phoneNumberId);

    await db
      .update(clients)
      .set({ whatsappPhoneId: phoneNumberId, whatsappNumber: displayNumber })
      .where(eq(clients.id, client.id));

    return Response.json({ ok: true, number: displayNumber });
  } catch (err) {
    console.error("[whatsapp/connect] falhou:", err);
    return Response.json(
      { error: "Não foi possível concluir a conexão com a Meta." },
      { status: 502 },
    );
  }
}
