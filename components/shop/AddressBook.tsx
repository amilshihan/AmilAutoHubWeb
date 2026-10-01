"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteAddress } from "@/app/(shop)/account/actions";
import { ADDRESS_TYPE_LABEL } from "@/lib/shop/config";
import type { CustomerAddress } from "@/lib/customer/addresses";
import AddressForm from "@/components/shop/AddressForm";

function AddressCard({ address, onEdit }: { address: CustomerAddress; onEdit: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove() {
    if (!confirm("Delete this address?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteAddress(address.id);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  return (
    <div className="rounded-xl border border-charcoal/10 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <span className="rounded-full bg-amil-soft px-2.5 py-0.5 text-xs font-bold text-charcoal">{ADDRESS_TYPE_LABEL[address.addressType]}</span>
          {address.isDefaultBilling && (
            <span className="ml-2 rounded-full bg-charcoal/10 px-2.5 py-0.5 text-xs font-bold text-charcoal">Default billing</span>
          )}
          {address.isDefaultShipping && (
            <span className="ml-2 rounded-full bg-charcoal/10 px-2.5 py-0.5 text-xs font-bold text-charcoal">Default shipping</span>
          )}
        </div>
        <div className="flex gap-3 text-sm font-bold">
          <button type="button" onClick={onEdit} className="text-charcoal underline decoration-amil decoration-2 underline-offset-2">
            Edit
          </button>
          <button type="button" onClick={remove} disabled={pending} className="text-deal underline decoration-2 underline-offset-2 disabled:opacity-60">
            {pending ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
      <div className="mt-3 text-sm text-charcoal">
        <p className="font-bold">{address.recipientName}</p>
        {address.companyName && <p>{address.companyName}</p>}
        <p>{address.mobile}</p>
        <p>{address.addressLine1}</p>
        {address.addressLine2 && <p>{address.addressLine2}</p>}
        <p>
          {address.city}, {address.district}
          {address.province ? `, ${address.province} Province` : ""}
          {address.postalCode ? ` ${address.postalCode}` : ""}
        </p>
        {address.deliveryInstructions && <p className="mt-1 text-charcoal/60">Note: {address.deliveryInstructions}</p>}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs font-semibold text-deal">
          {error}
        </p>
      )}
    </div>
  );
}

export default function AddressBook({ addresses }: { addresses: CustomerAddress[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-4">
      {addresses.map((a) =>
        editingId === a.id ? (
          <AddressForm key={a.id} existing={a} onDone={() => setEditingId(null)} />
        ) : (
          <AddressCard key={a.id} address={a} onEdit={() => setEditingId(a.id)} />
        )
      )}

      {addresses.length === 0 && !adding && <p className="text-sm text-charcoal/60">No saved addresses yet.</p>}

      {adding ? (
        <AddressForm onDone={() => setAdding(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="rounded-lg border border-charcoal/20 bg-white px-4 py-2.5 text-sm font-bold text-charcoal hover:bg-surface"
        >
          + Add new address
        </button>
      )}
    </div>
  );
}
