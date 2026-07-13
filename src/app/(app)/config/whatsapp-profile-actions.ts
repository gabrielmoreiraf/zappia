"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentClient } from "@/lib/current-client";
import { capsFor } from "@/lib/permissions";
import {
  getBusinessProfile,
  updateBusinessProfile,
  uploadProfilePicture,
  type BusinessProfile,
} from "@/lib/whatsapp";

type Result = { ok: boolean; error?: string };

async function ctx() {
  const user = await getCurrentUser();
  const client = await getCurrentClient();
  if (!user || !client) return null;
  if (!capsFor(user).config) return null;
  if (!client.whatsappPhoneId || client.whatsappPhoneId.startsWith("PENDENTE")) {
    return null;
  }
  return { client };
}

export async function loadWhatsappProfile(): Promise<BusinessProfile | null> {
  const c = await ctx();
  if (!c) return null;
  try {
    return await getBusinessProfile(c.client.whatsappPhoneId!);
  } catch (err) {
    console.error("[loadWhatsappProfile] falhou:", err);
    return null;
  }
}

export async function saveWhatsappProfile(formData: FormData): Promise<Result> {
  const c = await ctx();
  if (!c) return { ok: false, error: "Sem permissão." };

  const about = String(formData.get("about") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const websiteRaw = String(formData.get("website") ?? "").trim();

  try {
    await updateBusinessProfile(c.client.whatsappPhoneId!, {
      about,
      description,
      address,
      email,
      websites: websiteRaw ? [websiteRaw] : [],
    });
  } catch (err) {
    console.error("[saveWhatsappProfile] falhou:", err);
    return { ok: false, error: "Não foi possível salvar no WhatsApp agora." };
  }

  revalidatePath("/config");
  return { ok: true };
}

/** Foto vem como data URL (base64) do input file no navegador. */
export async function saveWhatsappProfilePicture(dataUrl: string): Promise<Result> {
  const c = await ctx();
  if (!c) return { ok: false, error: "Sem permissão." };

  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return { ok: false, error: "Imagem inválida." };
  const [, mimeType, base64] = match;
  if (!mimeType.startsWith("image/")) {
    return { ok: false, error: "Só aceita imagem." };
  }
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length > 5 * 1024 * 1024) {
    return { ok: false, error: "Imagem muito grande (máximo 5MB)." };
  }

  try {
    const handle = await uploadProfilePicture(bytes, mimeType);
    await updateBusinessProfile(c.client.whatsappPhoneId!, {
      profilePictureHandle: handle,
    });
  } catch (err) {
    console.error("[saveWhatsappProfilePicture] falhou:", err);
    return { ok: false, error: "Não foi possível enviar a foto agora." };
  }

  revalidatePath("/config");
  return { ok: true };
}
