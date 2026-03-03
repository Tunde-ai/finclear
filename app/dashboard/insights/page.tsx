import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/auth";

export default async function InsightsRedirect() {
  const role = await getUserRole();
  if (role === "ACCOUNTANT") {
    redirect("/dashboard/accountant");
  }
  redirect("/dashboard/client/insights");
}
