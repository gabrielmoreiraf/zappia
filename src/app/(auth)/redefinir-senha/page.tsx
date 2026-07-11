import { Suspense } from "react";
import { ResetForm } from "./reset-form";

export default function RedefinirSenhaPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center text-sm text-slate-400">Carregando…</div>
      }
    >
      <ResetForm />
    </Suspense>
  );
}
