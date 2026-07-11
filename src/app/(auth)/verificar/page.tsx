import { Suspense } from "react";
import { VerifyForm } from "./verify-form";

export default function VerificarPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center text-sm text-slate-400">Carregando…</div>
      }
    >
      <VerifyForm />
    </Suspense>
  );
}
