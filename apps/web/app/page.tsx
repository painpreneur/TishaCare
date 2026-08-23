import { redirect } from "next/navigation";
import { getCurrentDoctor } from "@/lib/session";

export default async function Home() {
  const doctor = await getCurrentDoctor();
  redirect(doctor ? "/dashboard" : "/login");
}
