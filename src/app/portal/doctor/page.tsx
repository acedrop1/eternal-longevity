import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal/PortalShell";
import { DOCTOR_NAV } from '@/components/portal/ui';
import { DoctorQueueList } from "@/components/doctor/DoctorQueueList";
import { AdminPageHeader } from "@/components/admin/IndexTable";
import { getSession, loginUrl } from "@/lib/auth-server";
import { listOrders, ordersDbConfigured } from "@/lib/orders-db";
import { doctorThreadStatuses, reviewsForOrders, type PatientReview } from "@/lib/clinical-review";
import { listMessageThreads, type MessageThread } from "@/lib/messages-db";
import { getPrescriber } from "@/lib/prescriber";
import type { Order } from "@/lib/orders";
import type { ThreadStatus } from "@/lib/prescriber-view";

export const metadata: Metadata = {
  title: "Clinical Queue",
};

export default async function DoctorPortalPage() {
  const user = await getSession();
  if (!user) redirect(await loginUrl());
  if (user.role !== "doctor") redirect(user.redirectTo);

  /*
   * The intake behind each waiting order. Fetched here rather than in the
   * client component so each row's flags load with the queue, not after a
   * second round trip.
   */
  const orders = await listOrders().catch(() => []);
  const assigned = orders.filter((o) => o.status === "assigned");
  let [reviews, threads, inbox]: [Record<string, PatientReview>, Record<string, ThreadStatus>, MessageThread[]] =
    await Promise.all([
      reviewsForOrders(assigned.map((o) => o.id)).catch(() => ({})),
      doctorThreadStatuses(assigned.map((o) => o.userId ?? "")),
      listMessageThreads("doctor").catch(() => []),
    ]);

  // Dev only: a sample queue so the page can be designed without Supabase.
  // NODE_ENV is inlined at build, so production never loads the fixture.
  let sampleOrders: Order[] | undefined;
  if (process.env.NODE_ENV === "development" && !(await ordersDbConfigured())) {
    const s = await import("@/components/doctor/dev-sample");
    sampleOrders = s.SAMPLE_DR_ORDERS;
    reviews = s.SAMPLE_DR_REVIEWS;
    threads = s.SAMPLE_DR_THREADS;
    inbox = s.SAMPLE_DR_INBOX;
  }

  /*
   * "Dr." is not automatic — an NP or PA holds the same queue but not the
   * title, so it comes off the credential the profile actually carries.
   */
  const prescriber = await getPrescriber(user.id).catch(() => null);
  const surname = user.name.split(" ").slice(-1)[0];
  const greeting = ["NP", "PA"].includes(prescriber?.credential ?? "")
    ? surname
    : `Dr. ${surname}`;

  return (
    <PortalShell
      user={user}
      nav={DOCTOR_NAV}
    >
      <div className="space-y-5">
        <AdminPageHeader
          title="Clinical queue"
          subtitle={
            <span className="text-[15px] md:text-[13px]">
              Welcome back, {greeting}. Every order arrives here the moment a member checks out. Signing charges
              their card and puts the order on{" "}
              <Link href="/portal/doctor/fulfillment" className="underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink">
                Orders
              </Link>{" "}
              to send to the pharmacy; declining charges nothing.
            </span>
          }
        />
        {sampleOrders && (
          <p className="rounded-inner border border-amber-600/25 bg-amber-50 px-4 py-2.5 text-[15px] text-amber-900 md:text-[13px]">
            Sample data (dev only). Real cases flow through once Supabase is connected.
          </p>
        )}
        <DoctorQueueList
          reviews={reviews}
          threads={threads}
          messagesAwaiting={inbox.filter((t) => t.awaitingReply).length}
          sampleOrders={sampleOrders}
        />
      </div>
    </PortalShell>
  );
}
