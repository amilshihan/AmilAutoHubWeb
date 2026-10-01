"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadProfilePhoto } from "@/app/(shop)/account/actions";

export default function ProfilePhotoUploader({ initialUrl, initials }: { initialUrl: string | null; initials: string }) {
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
    const result = await uploadProfilePhoto(formData);
    setBusy(false);
    if (result.ok) {
      setUrl(result.url);
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-charcoal/15 bg-amil-soft text-lg font-extrabold text-charcoal">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Profile photo" className="h-full w-full object-cover" />
        ) : (
          initials
        )}
      </div>
      <div>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={busy}
          className="rounded-lg border border-charcoal/20 bg-white px-3.5 py-2 text-sm font-semibold text-charcoal hover:bg-surface disabled:opacity-60"
        >
          {busy ? "Uploading..." : url ? "Change photo" : "Upload photo"}
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
