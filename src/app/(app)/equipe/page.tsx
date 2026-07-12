import { redirect } from "next/navigation";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { teamInvites, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentClient } from "@/lib/current-client";
import { capsFor } from "@/lib/permissions";
import { Header } from "../ui";
import { EquipeClient } from "./equipe-client";

export default async function EquipePage() {
  const user = await getCurrentUser();
  const client = await getCurrentClient();
  if (!user || !client) redirect("/clientes");
  if (!capsFor(user).team) redirect("/dashboard");

  const members = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      permissions: users.permissions,
      image: users.image,
    })
    .from(users)
    .where(eq(users.clientId, client.id));

  const invites = await db
    .select({
      id: teamInvites.id,
      name: teamInvites.name,
      email: teamInvites.email,
      permissions: teamInvites.permissions,
      createdAt: teamInvites.createdAt,
    })
    .from(teamInvites)
    .where(
      and(
        eq(teamInvites.clientId, client.id),
        isNull(teamInvites.acceptedAt),
        gt(teamInvites.expiresAt, new Date()),
      ),
    );

  members.sort((a) => (a.role === "owner" ? -1 : 1));

  return (
    <div>
      <Header
        title="Equipe"
        sub="Convide funcionários e defina o que cada um acessa."
      />
      <EquipeClient
        currentUserId={user.id}
        members={members}
        invites={invites}
      />
    </div>
  );
}
