"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadVehiclePhoto } from "@/app/(shop)/account/vehicle-actions";

export default function VehiclePhotoUploader({ vehicleId, initialUrl }: { vehicleId: string; initialUrl: string | null }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    const formData = new FormData();
    formData.set("photo", file);
    const result = await uploadVehiclePhoto(vehicleId, formData);
    setBusy(false);
    if (result.ok) {
      setUrl(result.url);
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Vehicle photo" className="h-16 w-24 rounded-lg object-cover" />
      ) : (
        <div className="flex h-16 w-24 items-center justify-center rounded-lg border border-dashed border-charcoal/20 text-xs text-charcoal/40">No photo</div>
      )}
      <div>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={busy}
          className="rounded-lg border border-charcoal/20 bg-white px-3 py-1.5 text-xs font-bold text-charcoal hover:bg-surface disabled:opacity-60"
        >
          {busy ? "Uploading..." : url ? "Change photo" : "Add photo"}
        </button>
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
        {error && (
          <p role="alert" className="mt-1 text-xs font-semibold text-deal">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
