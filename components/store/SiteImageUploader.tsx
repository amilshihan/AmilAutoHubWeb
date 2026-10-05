"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { helperText } from "@/lib/ui";

const ALLOWED = ["image/png", "image/jpeg", "image/webp"];

// Uploads the site logo or favicon as-is to the admin-only-writable product-images bucket.
export default function SiteImageUploader({
  value,
  onChange,
  kind,
  maxMb,
  hint,
}: {
  value: string;
  onChange: (url: string) => void;
  kind: "logo" | "favicon";
  maxMb: number;
  hint: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function handle(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!ALLOWED.includes(file.type)) return setError("Please choose a PNG, JPG or WebP image.");
    if (file.size > maxMb * 1024 * 1024) return setError(`The image must be smaller than ${maxMb}MB.`);
    setBusy(true);
    const supabase = createClient();
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `site/${kind}-${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type, upsert: false });
    setBusy(false);
    if (uploadError) {
      setError(/bucket not found/i.test(uploadError.message) ? "Image uploads aren't set up yet. Run supabase/migrations/0018_product_image_storage.sql." : uploadError.message);
      return;
    }
    onChange(supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl);
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div
        className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-input bg-white ${kind === "logo" ? "h-16 w-40" : "h-16 w-16"}`}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={kind === "logo" ? "Logo preview" : "Favicon preview"} className="h-full w-full object-contain p-1" />
        ) : (
          <span className="px-2 text-center text-xs text-muted">{kind === "logo" ? "Using the default logo" : "Using the default icon"}</span>
        )}
      </div>
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            className="rounded-lg border border-btn-secondary-border bg-white px-3.5 py-2 text-sm font-semibold text-btn-secondary-text hover:bg-surface disabled:opacity-60"
          >
            {busy ? "Uploading…" : value ? "Replace" : "Upload"}
          </button>
          {value && !busy && (
            <button type="button" onClick={() => onChange("")} className="text-sm font-semibold text-error hover:underline">
              Remove
            </button>
          )}
          <input
            ref={input}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              void handle(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
        <p className={helperText}>{hint}</p>
        {error && (
          <p role="alert" className="text-sm font-semibold text-error">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
