import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect, notFound } from "next/navigation";
import { getClientDetail } from "@/db/agency";
import { getCurrentUser } from "@/lib/current-user";
import { ClientDetailView } from "./client-detail-view";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) redirect("/dashboard");

  const { id } = await params;
  const detail = await getClientDetail(id);
  if (!detail) notFound();

  return (
    <div>
      <Link
        href="/clientes"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3"
      >
        <ArrowLeft size={15} /> Clientes
      </Link>
      <ClientDetailView detail={detail} />
    </div>
  );
}
