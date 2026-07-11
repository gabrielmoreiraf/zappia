import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { Header } from "../ui";
import { ProfileForm } from "./profile-form";

export default async function PerfilPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div>
      <Header title="Meu perfil" sub="Seus dados, foto e senha." />
      <ProfileForm
        user={{
          name: user.name ?? "",
          email: user.email,
          image: user.image,
        }}
      />
    </div>
  );
}
