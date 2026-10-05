import type { Metadata } from "next";
import Link from "next/link";
import { getShopInfo } from "@/lib/shop/data";
import PolicyPage, { type PolicySection } from "@/components/shop/PolicyPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What personal information Amil Auto Hub collects on this website, how it is used and shared, and your choices.",
};

export const revalidate = 300;

export default async function PrivacyPage() {
  const shop = await getShopInfo();
  const link = "font-semibold text-charcoal underline";

  const sections: PolicySection[] = [
    {
      heading: "Who we are",
      body: (
        <p>
          This website is run by {shop.legalName ?? shop.name}, {shop.address}. We are responsible for the personal information described in this policy.
        </p>
      ),
    },
    {
      heading: "Information we collect",
      body: (
        <ul>
          <li>
            <strong>When you place an order:</strong> your name, phone number, email address, delivery address, the items you buy, how you pay, and the
            vehicle you say the order is for (if you choose one).
          </li>
          <li>
            <strong>When you create an account:</strong> your name, email, mobile number and a password (stored only in scrambled form, never in plain text),
            or your name, email and profile picture if you sign in with Google. You may also add saved addresses, vehicles (make, model, registration number,
            photo), a profile photo, a wishlist and saved carts.
          </li>
          <li>
            <strong>Support requests:</strong> what you tell us in a ticket, and any photos or files you attach.
          </li>
          <li>
            <strong>Preferences and rewards:</strong> your marketing choices, loyalty points, referral code and activity on your account (such as sign-ins and
            changes to your details), which we keep for security.
          </li>
          <li>
            <strong>Ask Amil:</strong> the questions you type into the Ask Amil chat.
          </li>
          <li>
            <strong>Technical data:</strong> your IP address, used to protect the site from abuse.
          </li>
        </ul>
      ),
    },
    {
      heading: "Payments",
      body: (
        <p>
          We never see or store your card number. Online card and bank payments are handled by PayHere on its own secure page; we receive only the result of
          the payment and a reference number. Cash on delivery, pay at pickup and bank transfer payments are recorded against your order.
        </p>
      ),
    },
    {
      heading: "How we use your information",
      body: (
        <ul>
          <li>To process, deliver and support your orders, returns and refunds.</li>
          <li>To run your account, loyalty points and referrals.</li>
          <li>To recommend parts that fit the vehicles you have saved.</li>
          <li>To send you offers and reminders, only where you have switched that preference on.</li>
          <li>To keep the website secure, prevent fraud and meet our legal and accounting obligations.</li>
        </ul>
      ),
    },
    {
      heading: "Who we share it with",
      body: (
        <>
          <p>We do not sell your personal information. We share it only as needed with:</p>
          <ul>
            <li>
              <strong>PayHere</strong>, to take online payments;
            </li>
            <li>
              <strong>Couriers</strong>, who receive your name, phone number and delivery address to deliver your order;
            </li>
            <li>
              <strong>Google</strong>, if you choose to sign in with Google;
            </li>
            <li>
              <strong>Our technology providers</strong>, who host the website and its database for us (Vercel and Supabase);
            </li>
            <li>
              <strong>Our AI provider</strong>, which receives the questions you type into Ask Amil so it can answer them. Please do not put personal
              details such as phone numbers or addresses into the chat;
            </li>
            <li>authorities, where the law requires us to.</li>
          </ul>
        </>
      ),
    },
    {
      heading: "Cookies and similar technology",
      body: (
        <p>
          We use a sign-in cookie to keep you logged in to your account (for up to 30 days). Your cart, wishlist choices and preferred currency are kept in
          your browser&apos;s local storage so they are still there when you return. We do not use advertising or cross-site tracking cookies. You can clear
          these any time in your browser settings, but you will then be signed out and your cart will be emptied.
        </p>
      ),
    },
    {
      heading: "How long we keep it",
      body: (
        <p>
          We keep your account details while your account is open. Order, payment and refund records are kept for as long as we need them for warranty
          questions, accounting and tax. If you delete your account, it is deactivated and you are signed out; we may keep the order and payment records we
          are required to keep.
        </p>
      ),
    },
    {
      heading: "Your choices and rights",
      body: (
        <ul>
          <li>
            Update your details, addresses and vehicles in{" "}
            <Link href="/account" className={link}>
              My Account
            </Link>
            .
          </li>
          <li>
            Switch marketing messages on or off any time under{" "}
            <Link href="/account/preferences" className={link}>
              Preferences
            </Link>
            .
          </li>
          <li>
            Change your password or delete your account under{" "}
            <Link href="/account/security" className={link}>
              Security
            </Link>
            .
          </li>
          <li>Ask us what information we hold about you, or ask us to correct it, using the contact details below.</li>
        </ul>
      ),
    },
    {
      heading: "Security",
      body: (
        <p>
          We protect your information with encrypted connections, scrambled passwords and restricted staff access. No system is completely secure, so
          please choose a strong password and keep it private.
        </p>
      ),
    },
    {
      heading: "Changes to this policy",
      body: <p>If we change this policy, we will update the date at the top of this page. Please check it from time to time.</p>,
    },
  ];

  return (
    <PolicyPage
      title="Privacy Policy"
      intro={`${shop.name} respects your privacy. This policy explains what personal information we collect on this website, why, who we share it with, and the choices you have.`}
      sections={sections}
      shop={shop}
    />
  );
}
