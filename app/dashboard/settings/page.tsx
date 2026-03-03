import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/auth";

export default async function SettingsRedirect() {
  const role = await getUserRole();
  if (role === "ACCOUNTANT") {
    redirect("/dashboard/accountant/settings");
  }
  redirect("/dashboard/client/settings");
}
