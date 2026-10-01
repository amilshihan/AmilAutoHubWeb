"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { addWatermark } from "@/lib/admin/watermark";
import { helperText } from "@/lib/ui";

const MAX_BYTES = 10 * 1024 * 1024;

type Status = "idle" | "removing" | "watermarking" | "uploading" | "error";

export default function ProductImageUploader({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removeBg, setRemoveBg] = useState(true);
  const [watermark, setWatermark] = useState(true);
  const [showUrlField, setShowUrlField] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image must be smaller than 10MB.");
      return;
    }

    let blob: Blob = file;
    let contentType = file.type;
    let ext = file.name.split(".").pop()?.toLowerCase() || "jpg";

    if (removeBg) {
      setStatus("removing");
      setProgress("Removing background… this can take a few seconds, longer the first time.");
      try {
        const { removeBackground } = await import("@imgly/background-removal");
        blob = await removeBackground(file, {
          model: "isnet_quint8",
          output: { format: "image/png" },
          progress: (key, current, total) => {
            if (total > 0) setProgress(`Removing background… ${Math.round((current / total) * 100)}%`);
          },
        });
        contentType = "image/png";
        ext = "png";
      } catch {
        setError("Could not remove the background automatically. Uploaded the original photo instead.");
        blob = file;
        contentType = file.type;
      }
    }

    if (watermark) {
      setStatus("watermarking");
      setProgress("Adding Amil Auto Hub watermark…");
      try {
        blob = await addWatermark(blob);
        contentType = "image/png";
        ext = "png";
      } catch {
        setError("Could not add the watermark. Uploaded the photo without it.");
      }
    }

    setStatus("uploading");
    setProgress("Uploading…");
    const supabase = createClient();
    const path = `products/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("product-images").upload(path, blob, { contentType, upsert: false });
    if (uploadError) {
      setStatus("error");
      setProgress(null);
      setError(
        /bucket not found/i.test(uploadError.message)
          ? "Image uploads aren't set up yet. Run supabase/migrations/0018_product_image_storage.sql in the Supabase SQL editor."
          : uploadError.message
      );
      return;
    }

    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    setStatus("idle");
    setProgress(null);
    onChange(data.publicUrl);
  }

  const busy = status === "removing" || status === "watermarking" || status === "uploading";

  return (
    <div>
      <div className="flex items-start gap-4">
        <div
          className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-input"
          style={{
            backgroundImage:
              "linear-gradient(45deg,#e5e7eb 25%,transparent 25%),linear-gradient(-45deg,#e5e7eb 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e5e7eb 75%),linear-gradient(-45deg,transparent 75%,#e5e7eb 75%)",
            backgroundSize: "12px 12px",
            backgroundPosition: "0 0, 0 6px, 6px -6px, -6px 0",
          }}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="Product" className="h-full w-full object-contain" />
          ) : (
            <span className="px-2 text-center text-xs text-muted">No image</span>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={busy}
              className="rounded-lg border border-btn-secondary-border bg-white px-3.5 py-2 text-sm font-semibold text-btn-secondary-text hover:bg-surface disabled:opacity-60"
            >
              {value ? "Replace photo" : "Upload photo"}
            </button>
            {value && !busy && (
              <button type="button" onClick={() => onChange("")} className="text-sm font-semibold text-error hover:underline">
                Remove
              </button>
            )}
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                void handleFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={removeBg} onChange={(e) => setRemoveBg(e.target.checked)} disabled={busy} className="h-4 w-4 accent-primary" />
            Remove background automatically
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={watermark} onChange={(e) => setWatermark(e.target.checked)} disabled={busy} className="h-4 w-4 accent-primary" />
            Add Amil Auto Hub watermark
          </label>

          {busy && <p className="text-sm font-medium text-accent">{progress}</p>}
          {error && (
            <p role="alert" className="text-sm font-semibold text-error">
              {error}
            </p>
          )}

          <button type="button" onClick={() => setShowUrlField((v) => !v)} className="text-xs font-semibold text-accent hover:underline">
            {showUrlField ? "Hide" : "Or paste an image URL instead"}
          </button>
          {showUrlField && (
            <input
              value={value.startsWith("blob:") ? "" : value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="https://…"
              className="w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm text-ink placeholder:text-placeholder focus:border-accent focus:outline-none"
            />
          )}
        </div>
      </div>
      <p className={`${helperText} mt-2`}>
        Photos on a plain background work best. The background is removed and the Amil Auto Hub logo is added diagonally before upload, saved as a
        transparent PNG.
      </p>
    </div>
  );
}
