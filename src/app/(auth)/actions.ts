"use server";

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { isPasswordValid } from "@/lib/password";
import { createVerificationCode, checkVerificationCode } from "@/lib/verification";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AUTO_LOGIN_TTL_MS = 2 * 60_000;

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface VerifyEmailResult extends ActionResult {
  userId?: string;
  autoLoginToken?: string;
}

/** Cria a conta (não verificada) e dispara o código de 6 dígitos por e-mail. */
export async function signUp(formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .toLowerCase()
    .trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!name) return { ok: false, error: "Informe seu nome." };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "E-mail inválido." };
  if (!isPasswordValid(password))
    return { ok: false, error: "A senha não atende às regras." };
  if (password !== confirm)
    return { ok: false, error: "As senhas não coincidem." };

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing?.emailVerifiedAt) {
    return { ok: false, error: "Esse e-mail já tem conta. Faça login." };
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  if (existing) {
    // Conta existe mas não verificada → atualiza dados e reenvia.
    await db
      .update(users)
      .set({ name, passwordHash })
      .where(eq(users.id, existing.id));
  } else {
    await db.insert(users).values({
      email,
      name,
      passwordHash,
      role: "member",
    });
  }

  try {
    const code = await createVerificationCode(email);
    await sendVerificationEmail(email, code, name);
  } catch (err) {
    console.error("[signUp] envio de e-mail falhou:", err);
    return {
      ok: false,
      error: "Não consegui enviar o e-mail de verificação. Tente de novo.",
    };
  }

  return { ok: true };
}

/**
 * Confirma o código e ativa a conta. Gera junto um token de uso único (curta
 * duração) pra logar automaticamente na sequência, sem pedir a senha nem
 * passar pelo /login: o cadastro é um fluxo só, sem interrupção.
 */
export async function verifyEmail(
  email: string,
  code: string,
): Promise<VerifyEmailResult> {
  const e = email.toLowerCase().trim();
  const c = code.replace(/\D/g, "");
  if (c.length !== 6) return { ok: false, error: "Digite os 6 dígitos." };

  const result = await checkVerificationCode(e, c);
  if (result === "ok") {
    const token = crypto.randomBytes(24).toString("hex");
    const [u] = await db
      .update(users)
      .set({
        emailVerifiedAt: new Date(),
        autoLoginToken: bcrypt.hashSync(token, 10),
        autoLoginTokenExpiresAt: new Date(Date.now() + AUTO_LOGIN_TTL_MS),
      })
      .where(eq(users.email, e))
      .returning({ id: users.id });
    return { ok: true, userId: u.id, autoLoginToken: token };
  }

  const messages: Record<string, string> = {
    invalid: "Código incorreto.",
    expired: "Código expirado. Reenvie um novo.",
    too_many: "Muitas tentativas. Reenvie um novo código.",
    not_found: "Nenhum código pendente para esse e-mail.",
  };
  return { ok: false, error: messages[result] };
}

/** Esqueci a senha: envia um código de redefinição (se a conta existir). */
export async function requestPasswordReset(
  email: string,
): Promise<ActionResult> {
  const e = email.toLowerCase().trim();
  if (!EMAIL_RE.test(e)) return { ok: false, error: "E-mail inválido." };

  const [u] = await db.select().from(users).where(eq(users.email, e)).limit(1);
  // Não revela se o e-mail existe: sempre responde ok.
  if (u) {
    try {
      const code = await createVerificationCode(e);
      await sendPasswordResetEmail(e, code, u.name);
    } catch (err) {
      console.error("[requestPasswordReset] envio falhou:", err);
      return { ok: false, error: "Falha ao enviar o e-mail. Tente de novo." };
    }
  }
  return { ok: true };
}

/** Redefine a senha com o código enviado por e-mail. */
export async function resetPassword(
  email: string,
  code: string,
  password: string,
  confirm: string,
): Promise<ActionResult> {
  const e = email.toLowerCase().trim();
  if (!isPasswordValid(password))
    return { ok: false, error: "A senha não atende às regras." };
  if (password !== confirm)
    return { ok: false, error: "As senhas não coincidem." };

  const result = await checkVerificationCode(e, code.replace(/\D/g, ""));
  if (result !== "ok") {
    const messages: Record<string, string> = {
      invalid: "Código incorreto.",
      expired: "Código expirado. Peça um novo.",
      too_many: "Muitas tentativas. Peça um novo código.",
      not_found: "Nenhum código pendente para esse e-mail.",
    };
    return { ok: false, error: messages[result] };
  }

  await db
    .update(users)
    .set({ passwordHash: bcrypt.hashSync(password, 10) })
    .where(eq(users.email, e));
  return { ok: true };
}

/** Reenvia o código de verificação. */
export async function resendCode(email: string): Promise<ActionResult> {
  const e = email.toLowerCase().trim();
  const [u] = await db.select().from(users).where(eq(users.email, e)).limit(1);
  if (!u) return { ok: false, error: "Conta não encontrada." };
  if (u.emailVerifiedAt) return { ok: false, error: "Conta já verificada." };

  try {
    const code = await createVerificationCode(e);
    await sendVerificationEmail(e, code, u.name);
  } catch (err) {
    console.error("[resendCode] envio falhou:", err);
    return { ok: false, error: "Falha ao reenviar. Tente de novo." };
  }
  return { ok: true };
}
