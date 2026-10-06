import type { Metadata } from "next";
import Link from "next/link";
import { getShopInfo } from "@/lib/shop/data";
import PolicyPage, { type PolicySection } from "@/components/shop/PolicyPage";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms that apply when you browse and buy from the Amil Auto Hub website.",
};

export const revalidate = 300;

export default async function TermsPage() {
  const shop = await getShopInfo();
  const link = "font-semibold text-charcoal underline";

  const sections: PolicySection[] = [
    {
      heading: "About these terms",
      body: (
        <p>
          These terms apply to your use of this website and to every order you place through it. The website is operated by{" "}
          {shop.legalName ?? shop.name}, {shop.address}. By placing an order you agree to these terms, our{" "}
          <Link href="/returns" className={link}>
            Return &amp; Refund Policy
          </Link>{" "}
          and our{" "}
          <Link href="/privacy" className={link}>
            Privacy Policy
          </Link>
          .
        </p>
      ),
    },
    {
      heading: "Products and fitment",
      body: (
        <>
          <p>
            We sell genuine spare parts, lubricants and automotive products. We take care to describe products correctly, but images are for guidance and
            packaging may differ slightly.
          </p>
          <p>
            Vehicle compatibility information on the website is a guide. If a product is not marked as confirmed to fit your vehicle, please check with us
            before you order. You are responsible for choosing the correct part for your vehicle.
          </p>
        </>
      ),
    },
    {
      heading: "Prices and availability",
      body: (
        <ul>
          <li>All prices are in Sri Lankan Rupees (LKR). Other currencies shown on the site are estimates for information only.</li>
          <li>Prices and stock can change without notice. The price that applies is the one shown when you place your order.</li>
          <li>If a product is out of stock or a price was shown by mistake, we will contact you and you can choose to wait, change or cancel the item without charge.</li>
        </ul>
      ),
    },
    {
      heading: "Placing an order",
      body: (
        <p>
          An order is a request to buy. It is accepted when we confirm it. We may decline or cancel an order, for example because of a stock problem, an
          address we cannot deliver to, or suspected fraud, and we will refund anything you have already paid.
        </p>
      ),
    },
    {
      heading: "Payment",
      body: (
        <p>
          The payment methods available are shown at checkout and may include cash on delivery, pay at pickup, bank transfer and online card or bank payment
          through PayHere. Orders paid by bank transfer are processed once the payment reaches our account. We do not store your card details.
        </p>
      ),
    },
    {
      heading: "Delivery and pickup",
      body: (
        <ul>
          <li>Delivery options, charges and estimated times are shown at checkout. Estimates are not guaranteed.</li>
          <li>You can instead collect your order from our shop in Kottawa at no charge.</li>
          <li>Please give a correct address and a phone number we can reach, so the courier can deliver to you.</li>
          <li>Please check your parcel when you receive it and tell us straight away about any damage.</li>
        </ul>
      ),
    },
    {
      heading: "Returns and refunds",
      body: (
        <p>
          Returns, refunds and cancellations are covered by our{" "}
          <Link href="/returns" className={link}>
            Return &amp; Refund Policy
          </Link>
          .
        </p>
      ),
    },
    {
      heading: "Your account",
      body: (
        <p>
          You are responsible for keeping your password private and for what happens under your account. Tell us if you think someone else has used it. We
          may suspend an account that is used for fraud or abuse.
        </p>
      ),
    },
    {
      heading: "Loyalty points, coupons and offers",
      body: (
        <ul>
          <li>Loyalty points and referral rewards have no cash value and cannot be transferred.</li>
          <li>Coupons and offers have conditions, such as a minimum order or an end date, and cannot be combined unless we say so.</li>
          <li>We may change or end the rewards programme and any offer, but points you have already earned are honoured under the terms that applied when you earned them.</li>
        </ul>
      ),
    },
    {
      heading: "Our responsibility",
      body: (
        <p>
          We are responsible for supplying products that match their description and are of satisfactory quality. We are not liable for indirect losses, or for
          problems caused by incorrect installation or use. Nothing in these terms limits any right you have under Sri Lankan consumer law that cannot be
          excluded.
        </p>
      ),
    },
    {
      heading: "Using the website",
      body: (
        <p>
          Please use the website lawfully. The content, logos and images belong to {shop.legalName ?? shop.name} or its suppliers and may not be copied
          without permission. We may update or interrupt the website for maintenance.
        </p>
      ),
    },
    {
      heading: "Governing law and changes",
      body: (
        <p>
          These terms are governed by the laws of Sri Lanka, and its courts have jurisdiction over any dispute. We may update these terms from time to time;
          the version on this page when you order is the one that applies to that order.
        </p>
      ),
    },
  ];

  return (
    <PolicyPage
      title="Terms & Conditions"
      intro={`Please read these terms before using the ${shop.name} website or placing an order.`}
      sections={sections}
      shop={shop}
    />
  );
}
