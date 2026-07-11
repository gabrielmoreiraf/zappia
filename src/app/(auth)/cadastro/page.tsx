import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignupForm } from "./signup-form";

export default async function CadastroPage() {
  const session = await auth();
  if (session) redirect("/dashboard");
  return <SignupForm />;
}
