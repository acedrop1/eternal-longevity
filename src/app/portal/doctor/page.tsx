import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal/PortalShell";
import { DOCTOR_NAV } from '@/components/portal/ui';
import { DoctorQueueList } from "@/components/doctor/DoctorQueueList";
import { getSession } from "@/lib/auth-server";
import { listOrders } from "@/lib/orders-db";
import { reviewsForOrders } from "@/lib/clinical-review";
import { getPrescriber } from "@/lib/prescriber";
import { signWindowOpen } from "@/lib/reauth";

export const metadata: Metadata = {
  title: "Clinical Queue",
};

export default async function DoctorPortalPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "doctor") redirect(user.redirectTo);

  /*
   * The intake behind each waiting order. Fetched here rather than in the
   * client component so the prescriber never sees a card he cannot act on —
   * the record loads with the queue, not after a second round trip.
   */
  const orders = await listOrders().catch(() => []);
  const waiting = orders
    .filter((o) => o.status === "assigned")
    .map((o) => o.id);
  const reviews = await reviewsForOrders(waiting).catch(() => ({}));

  /*
   * "Dr." is not automatic — an NP or PA holds the same queue but not the
   * title, so it comes off the credential the profile actually carries.
   */
  const prescriber = await getPrescriber(user.id).catch(() => null);
  const reauthed = await signWindowOpen(user.id);
  const surname = user.name.split(" ").slice(-1)[0];
  const greeting = ["NP", "PA"].includes(prescriber?.credential ?? "")
    ? surname
    : `Dr. ${surname}`;

  return (
    <PortalShell
      user={user}
      nav={DOCTOR_NAV}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-[13px] font-medium text-ink/55">
            Clinical queue
          </p>
          <h1
            className="text-[36px] font-semibold leading-[1] tracking-[-0.045em] text-ink [text-wrap:balance] md:text-[48px]"
          >
            Welcome back, {greeting}.
          </h1>
          <p className="mt-3 max-w-[68ch] text-[16px] leading-relaxed text-ink-soft">
            Every order arrives here the moment a member checks out — a first
            order and a returning member&apos;s tenth alike. Signing charges
            their card and puts the order on{" "}
            <a href="/portal/doctor/fulfillment" className="underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink">Orders</a>{" "}
            to send to the pharmacy; declining charges nothing.
          </p>
        </div>
      </div>

      <DoctorQueueList
        doctorName={user.name}
        reviews={reviews}
        signWindowOpen={reauthed}
      />
    </PortalShell>
  );
}
