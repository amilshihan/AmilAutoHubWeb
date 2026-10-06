import type { Metadata } from "next";
import Link from "next/link";
import { getShopInfo } from "@/lib/shop/data";
import PolicyPage, { type PolicySection } from "@/components/shop/PolicyPage";
import { RETURN_EXCLUSIONS, RETURN_WINDOW_DAYS } from "@/lib/shop/policyFacts";

export const metadata: Metadata = {
  title: "Return & Refund Policy",
  description: "How to return a product to Amil Auto Hub, which items can be returned, and how refunds are paid.",
};

export const revalidate = 300;

export default async function ReturnsPage() {
  const shop = await getShopInfo();

  const sections: PolicySection[] = [
    {
      heading: "Return window",
      body: (
        <p>
          You can return a product within <strong>{RETURN_WINDOW_DAYS} days</strong> of receiving it (the day it is delivered to you, or the day you collect it from our
          Kottawa shop).
        </p>
      ),
    },
    {
      heading: "What can be returned",
      body: (
        <>
          <p>To be accepted for return, the product must be:</p>
          <ul>
            <li>unused and, for parts, not installed on a vehicle;</li>
            <li>in its original, undamaged packaging with any labels and seals intact; and</li>
            <li>accompanied by your order number or receipt.</li>
          </ul>
        </>
      ),
    },
    {
      heading: "What cannot be returned",
      body: (
        <ul>
          {RETURN_EXCLUSIONS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ),
    },
    {
      heading: "Wrong, damaged or faulty items",
      body: (
        <p>
          If we sent the wrong product, or it arrived damaged or faulty, contact us within the {RETURN_WINDOW_DAYS}-day window. We will arrange a replacement or a refund and
          cover the return cost. Please check the vehicle compatibility on the product page, or ask us, before ordering. A part that was ordered for the
          wrong vehicle can still be returned under the conditions above.
        </p>
      ),
    },
    {
      heading: "How to start a return",
      body: (
        <>
          <p>Tell us which order and product you want to return, and why, using any of these:</p>
          <ul>
            <li>
              <Link href="/account/support" className="font-semibold text-charcoal underline">
                My Account &rarr; Support
              </Link>{" "}
              (raise a ticket linked to your order);
            </li>
            <li>WhatsApp or phone, using the details below.</li>
          </ul>
          <p>We will confirm whether the return is accepted and tell you where to bring or send the product.</p>
        </>
      ),
    },
    {
      heading: "Refunds",
      body: (
        <>
          <p>Once we have received and checked the returned product, we will confirm the refund. It is paid back the way you paid:</p>
          <ul>
            <li>
              <strong>Card or online payment (PayHere):</strong> refunded to the same card or account through PayHere. The time it takes to appear
              depends on your bank.
            </li>
            <li>
              <strong>Bank transfer:</strong> refunded to the bank account you paid from.
            </li>
            <li>
              <strong>Cash on delivery or pay at pickup:</strong> refunded in cash at our shop, or by bank transfer if you prefer.
            </li>
          </ul>
          <p>
            Delivery charges are refunded only when we sent the wrong product or it was damaged or faulty. Discounts and coupons used on the order are taken
            into account, so you are refunded what you actually paid for the returned items.
          </p>
        </>
      ),
    },
    {
      heading: "Cancelling an order",
      body: (
        <p>
          You can ask us to cancel an order before it is dispatched. Contact us as soon as possible. If you have already paid, the amount is refunded as
          described above. Once an order has been dispatched, the normal return process applies.
        </p>
      ),
    },
  ];

  return (
    <PolicyPage
      title="Return & Refund Policy"
      intro={`We want you to be happy with what you buy from ${shop.name}. This policy explains how returns, refunds and cancellations work for orders placed on this website.`}
      sections={sections}
      shop={shop}
    />
  );
}
