"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { helperText } from "@/lib/ui";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/webp"];

// Banner photos are uploaded as-is (no background removal or watermark, unlike products).
export default function BannerImageUploader({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrlField, setShowUrlField] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!ALLOWED.includes(file.type)) return setError("Please choose a PNG, JPG or WebP image.");
    if (file.size > MAX_BYTES) return setError("Image must be smaller than 10MB.");

    setBusy(true);
    const supabase = createClient();
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `banners/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type, upsert: false });
    setBusy(false);
    if (uploadError) {
      setError(
        /bucket not found/i.test(uploadError.message)
          ? "Image uploads aren't set up yet. Run supabase/migrations/0018_product_image_storage.sql in the Supabase SQL editor."
          : uploadError.message
      );
      return;
    }
    onChange(supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex h-24 w-56 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-input bg-charcoal">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="Banner preview" className="h-full w-full object-cover" />
          ) : (
            <span className="px-2 text-center text-xs text-white/60">No image (charcoal background)</span>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={busy}
              className="rounded-lg border border-btn-secondary-border bg-white px-3.5 py-2 text-sm font-semibold text-btn-secondary-text hover:bg-surface disabled:opacity-60"
            >
              {busy ? "Uploading…" : value ? "Replace image" : "Upload image"}
            </button>
            {value && !busy && (
              <button type="button" onClick={() => onChange("")} className="text-sm font-semibold text-error hover:underline">
                Remove
              </button>
            )}
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                void handleFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm font-semibold text-error">
              {error}
            </p>
          )}
          <button type="button" onClick={() => setShowUrlField((v) => !v)} className="text-xs font-semibold text-accent hover:underline">
            {showUrlField ? "Hide" : "Or paste an image URL instead"}
          </button>
        </div>
      </div>
      {showUrlField && (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://…"
          className="w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm text-ink placeholder:text-placeholder focus:border-accent focus:outline-none"
        />
      )}
      <p className={helperText}>Wide images (about 1200 × 500, PNG, JPG or WebP, under 10MB) work best.</p>
    </div>
  );
}
