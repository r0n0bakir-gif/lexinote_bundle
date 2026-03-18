import { redirect } from "next/navigation";
import { getOptionalCurrentUser } from "@/lib/current-user";

export async function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user } = await getOptionalCurrentUser();
  if (!user) redirect("/auth");
  return <>{children}</>;
}
