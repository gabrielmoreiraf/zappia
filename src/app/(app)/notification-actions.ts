"use server";

import { db } from "@/db";
import { dismissedNotifications } from "@/db/schema";
import { getCurrentClient } from "@/lib/current-client";

/** Dispensa uma notificação (some do sino). */
export async function dismissNotification(key: string) {
  const client = await getCurrentClient();
  if (!client || !key) return;
  await db
    .insert(dismissedNotifications)
    .values({ clientId: client.id, notifKey: key })
    .onConflictDoNothing({
      target: [
        dismissedNotifications.clientId,
        dismissedNotifications.notifKey,
      ],
    });
}

/** Limpa todas as notificações visíveis. */
export async function clearNotifications(keys: string[]) {
  const client = await getCurrentClient();
  if (!client || keys.length === 0) return;
  await db
    .insert(dismissedNotifications)
    .values(keys.map((notifKey) => ({ clientId: client.id, notifKey })))
    .onConflictDoNothing({
      target: [
        dismissedNotifications.clientId,
        dismissedNotifications.notifKey,
      ],
    });
}
