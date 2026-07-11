"use client";

import { useTransition } from "react";
import { updateLeadStatus } from "../actions";
import { LEAD_STATUS } from "../ui";

export function LeadStatusSelect({
  leadId,
  status,
}: {
  leadId: string;
  status: "novo" | "contato" | "matriculado";
}) {
  const [pending, start] = useTransition();
  return (
    <select
      value={status}
      disabled={pending}
      onChange={(e) =>
        start(() =>
          updateLeadStatus(
            leadId,
            e.target.value as "novo" | "contato" | "matriculado",
          ),
        )
      }
      className={`text-[11px] px-2 py-1 rounded-full font-medium border-0 outline-none cursor-pointer ${LEAD_STATUS[status].cls} disabled:opacity-50`}
    >
      <option value="novo">Novo</option>
      <option value="contato">Em contato</option>
      <option value="matriculado">Matriculado</option>
    </select>
  );
}
