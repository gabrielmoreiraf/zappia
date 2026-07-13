import { redirect } from "next/navigation";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { adminInvites, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/current-user";
import { Header } from "../ui";
import { AdminsClient } from "./admins-client";

export default async function AdminsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/dashboard");

  const admins = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
    })
    .from(users)
    .where(eq(users.isAdmin, true));

  const invites = await db
    .select({
      id: adminInvites.id,
      name: adminInvites.name,
      email: adminInvites.email,
      createdAt: adminInvites.createdAt,
    })
    .from(adminInvites)
    .where(
      and(isNull(adminInvites.acceptedAt), gt(adminInvites.expiresAt, new Date())),
    );

  return (
    <div>
      <Header
        title="Administradores"
        sub="Quem tem acesso total à agência (todos os clientes e o faturamento)."
      />
      <AdminsClient
        currentUserId={user.id}
        admins={admins}
        invites={invites}
      />
    </div>
  );
}
