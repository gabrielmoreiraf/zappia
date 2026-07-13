import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { adminInvites } from "@/db/schema";
import { AcceptForm } from "./accept-form";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ConviteAdminPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const i = token.indexOf(".");
  const id = i > 0 ? token.slice(0, i) : "";
  const secret = i > 0 ? token.slice(i + 1) : "";

  let valid = false;
  let name = "";

  if (UUID_RE.test(id) && secret) {
    const [inv] = await db
      .select()
      .from(adminInvites)
      .where(eq(adminInvites.id, id))
      .limit(1);
    if (
      inv &&
      !inv.acceptedAt &&
      inv.expiresAt > new Date() &&
      bcrypt.compareSync(secret, inv.tokenHash)
    ) {
      valid = true;
      name = inv.name;
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <span className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-extrabold">
            Z
          </span>
          <span className="font-bold text-lg text-slate-900">Zappia</span>
        </div>

        {valid ? (
          <AcceptForm token={token} name={name} />
        ) : (
          <div>
            <h1 className="text-lg font-bold text-slate-900 mb-1">
              Convite inválido
            </h1>
            <p className="text-sm text-slate-500">
              Esse convite não existe, já foi usado ou expirou. Peça um novo para
              quem te convidou.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
