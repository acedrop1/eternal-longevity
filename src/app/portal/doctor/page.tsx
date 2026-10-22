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
  // Placed, but the patient hasn't finished the health questions asked after checkout: shown
  // (not signable) so he sees what's coming the moment admin does.
  const comingUp = orders
    .filter((o) => o.status === "awaiting-visit" || o.status === "pending-admin")
    .sort((a, b) => b.placedAt - a.placedAt);
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
            <span className="text-[15px] md:text-[14px]">
              Welcome back, {greeting}. An order is ready for you once the patient answers the health questions
              after checkout; until then it waits under Coming up. Signing charges
              their card and puts the order on{" "}
              <Link href="/portal/doctor/fulfillment" className="underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink">
                Orders
              </Link>{" "}
              to send to the pharmacy; declining charges nothing.
            </span>
          }
        />
        {sampleOrders && (
          <p className="rounded-inner border border-amber-600/25 bg-amber-50 px-4 py-2.5 text-[15px] text-amber-900 md:text-[14px]">
            Sample data (dev only). Real cases flow through once Supabase is connected.
          </p>
        )}
        <DoctorQueueList
          reviews={reviews}
          threads={threads}
          messagesAwaiting={inbox.filter((t) => t.awaitingReply).length}
          sampleOrders={sampleOrders}
        />

        {comingUp.length > 0 && (
          <section aria-labelledby="coming-up" className="rounded-inner border border-ink/[0.1] bg-white">
            <div className="flex items-baseline justify-between gap-3 border-b border-ink/10 px-4 py-3">
              <h2 id="coming-up" className="text-[16px] font-semibold text-ink md:text-[15px]">
                Coming up <span className="font-medium tabular-nums text-ink/50">{comingUp.length}</span>
              </h2>
              <p className="text-[13px] text-ink/60">Waiting on the patient&rsquo;s health questions. Not ready to sign yet.</p>
            </div>
            <ul>
              {comingUp.map((o) => (
                <li key={o.id} className="border-b border-ink/[0.06] last:border-0">
                  <Link
                    href={`/portal/doctor/review/${encodeURIComponent(o.id)}`}
                    className="flex items-center justify-between gap-4 px-4 py-3 text-ink/70 hover:bg-milk/60"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-semibold text-ink/80">{o.memberName}</span>
                      <span className="block truncate text-[13.5px]">
                        Order #{o.id} · {o.lines.map((l) => l.productName).join(", ")}
                      </span>
                    </span>
                    <span className="flex-none text-right text-[13px]">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-milk px-2.5 py-1 font-medium text-ink/70">
                        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ink/35" />
                        Health questions pending
                      </span>
                      <span className="mt-1 block tabular-nums text-ink/50">
                        {new Date(o.placedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </PortalShell>
  );
}
