import type { ShopInfo } from "@/lib/shop/types";

export type PolicySection = { heading: string; body: React.ReactNode };

export const POLICY_UPDATED = "5 October 2026";

export function ContactBlock({ shop }: { shop: ShopInfo }) {
  return (
    <ul className="mt-2 space-y-1">
      <li>
        <strong>{shop.legalName ?? shop.name}</strong>
      </li>
      <li>{shop.address}</li>
      <li>
        Phone:{" "}
        <a href={`tel:${shop.phone.replace(/\s/g, "")}`} className="font-semibold text-charcoal underline">
          {shop.phone}
        </a>
      </li>
      {shop.emails.map((e) => (
        <li key={e.address}>
          Email:{" "}
          <a href={`mailto:${e.address}`} className="font-semibold text-charcoal underline">
            {e.address}
          </a>
        </li>
      ))}
      <li>You can also message us on WhatsApp or raise a ticket from My Account &rarr; Support.</li>
    </ul>
  );
}

export default function PolicyPage({
  title,
  intro,
  sections,
  shop,
}: {
  title: string;
  intro: string;
  sections: PolicySection[];
  shop: ShopInfo;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight text-charcoal sm:text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-charcoal/55">Last updated {POLICY_UPDATED}</p>
      <p className="mt-5 leading-relaxed text-charcoal/75">{intro}</p>

      <div className="mt-8 space-y-8">
        {sections.map((s, i) => (
          <section key={s.heading}>
            <h2 className="text-xl font-extrabold text-charcoal">
              {i + 1}. {s.heading}
            </h2>
            <div className="mt-2 space-y-3 leading-relaxed text-charcoal/75 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">{s.body}</div>
          </section>
        ))}
        <section>
          <h2 className="text-xl font-extrabold text-charcoal">{sections.length + 1}. Contact us</h2>
          <div className="mt-2 leading-relaxed text-charcoal/75">
            <p>Questions about this page? Get in touch:</p>
            <ContactBlock shop={shop} />
          </div>
        </section>
      </div>
    </div>
  );
}
