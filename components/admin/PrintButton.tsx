"use client";

import { btnPrimary } from "@/lib/ui";

export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className={btnPrimary}>
      Print invoice
    </button>
  );
}
