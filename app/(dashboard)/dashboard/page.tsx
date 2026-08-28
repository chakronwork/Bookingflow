import { getSession } from "@/lib/auth/session";
import QueueBoard from "@/components/dashboard/queue-board";
import ServiceManager from "@/components/dashboard/service-manager";

export default async function DashboardPage() {
  const session = await getSession();

  return <main className="min-h-screen bg-[#f4f7f6] p-5 sm:p-8"><div className="mx-auto max-w-6xl space-y-7"><QueueBoard role={session?.role || "staff"} /><ServiceManager /></div></main>;
}