"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, type Client } from "@/db/schema";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentClient } from "@/lib/current-client";
import { capsFor } from "@/lib/permissions";

type Result = { ok: boolean; error?: string };

/** Verde padrão do Zappia — guardado como null (sem tema custom). */
const DEFAULT_BRAND = "#10b981";

/** Quem tem a permissão de Personalização mexe na marca. */
async function ownerClient(): Promise<Client | null> {
  const user = await getCurrentUser();
  const client = await getCurrentClient();
  if (!user || !client) return null;
  return capsFor(user).branding ? client : null;
}

function refreshShell() {
  revalidatePath("/personalizacao");
  // Sidebar/topbar e o tema do painel vivem no layout.
  revalidatePath("/", "layout");
}

export interface PersonalizationInput {
  name: string;
  brandColor: string | null;
  logo: string | null;
}

export async function savePersonalization(
  input: PersonalizationInput,
): Promise<Result> {
  const client = await ownerClient();
  if (!client) return { ok: false, error: "Sem permissão." };

  const name = (input.name ?? "").trim();
  if (!name) return { ok: false, error: "Informe o nome do negócio." };
  if (name.length > 80) return { ok: false, error: "Nome muito longo." };

  // Cor: aceita null ou #rrggbb. O verde padrão vira null (sem tema).
  let brandColor: string | null = null;
  if (input.brandColor) {
    const c = input.brandColor.trim().toLowerCase();
    if (!/^#[0-9a-f]{6}$/.test(c)) {
      return { ok: false, error: "Cor inválida." };
    }
    brandColor = c === DEFAULT_BRAND ? null : c;
  }

  // Logo: null (sem logo) ou data URL de imagem até ~400KB.
  let logoUrl: string | null = null;
  if (input.logo) {
    if (!/^data:image\/(png|jpe?g|webp);base64,/.test(input.logo)) {
      return { ok: false, error: "Imagem inválida." };
    }
    if (input.logo.length > 400_000) {
      return { ok: false, error: "Imagem muito grande. Tente outra." };
    }
    logoUrl = input.logo;
  }

  await db
    .update(clients)
    .set({ name, brandColor, logoUrl })
    .where(eq(clients.id, client.id));
  refreshShell();
  return { ok: true };
}

/** Volta a marca ao padrão do Zappia: verde e sem logo (mantém o nome). */
export async function resetPersonalization(): Promise<Result> {
  const client = await ownerClient();
  if (!client) return { ok: false, error: "Sem permissão." };
  await db
    .update(clients)
    .set({ brandColor: null, logoUrl: null })
    .where(eq(clients.id, client.id));
  refreshShell();
  return { ok: true };
}
