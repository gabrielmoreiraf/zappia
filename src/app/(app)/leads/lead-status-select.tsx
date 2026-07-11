"use client";

import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateLeadStatus } from "../actions";
import { LEAD_STATUS } from "../ui";

type Status = "novo" | "contato" | "matriculado";

export function LeadStatusSelect({
  leadId,
  status,
}: {
  leadId: string;
  status: Status;
}) {
  const [pending, start] = useTransition();
  return (
    <Select
      value={status}
      disabled={pending}
      onValueChange={(v) => start(() => updateLeadStatus(leadId, v as Status))}
    >
      <SelectTrigger
        size="sm"
        className={`h-7 w-auto border-0 text-[11px] font-medium ${LEAD_STATUS[status].cls}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="novo">Novo</SelectItem>
        <SelectItem value="contato">Em contato</SelectItem>
        <SelectItem value="matriculado">Matriculado</SelectItem>
      </SelectContent>
    </Select>
  );
}
