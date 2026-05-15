import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const role = (session.user as any).role;
  if (role === "EMPLOYEE") redirect("/operator");
  if (role === "FOREMAN" || role === "ENGINEER" || role === "CONTRACTOR") redirect("/tasks");
  redirect("/dashboard");
}
