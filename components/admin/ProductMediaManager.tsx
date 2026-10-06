"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fieldLabel, helperText, inputBase } from "@/lib/ui";
import ProductImageUploader from "@/components/admin/ProductImageUploader";

export type ImageType = "main" | "gallery" | "label" | "technical";

export type MediaItem = {
  key: string;
  id?: string;
  media_type: "image" | "video";
  image_type: ImageType | "video";
  url: string;
  alt_text: string;
  is_primary: boolean;
};

const IMAGE_MAX = 10 * 1024 * 1024;
const VIDEO_MAX = 50 * 1024 * 1024;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const VIDEO_TYPES = ["video/mp4", "video/webm"];

const TYPE_LABEL: Record<ImageType, string> = {
  main: "Main image",
  gallery: "Gallery image",
  label: "Label image",
  technical: "Technical / specification image",
};

const newKey = () => crypto.randomUUID();

export function normaliseMedia(items: MediaItem[]): MediaItem[] {
  const images = items.filter((i) => i.media_type === "image");
  const hasPrimary = images.some((i) => i.is_primary);
  const fallback = images.find((i) => i.image_type === "main") ?? images[0];
  return items.map((i) => ({ ...i, is_primary: i.media_type === "image" && (hasPrimary ? i.is_primary : i === fallback) }));
}

export default function ProductMediaManager({
  items,
  onChange,
  productName,
}: {
  items: MediaItem[];
  onChange: (items: MediaItem[]) => void;
  productName: string;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const pickType = useRef<ImageType>("gallery");
  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);

  const images = items.filter((i) => i.media_type === "image");
  const video = items.find((i) => i.media_type === "video");
  const main = images.find((i) => i.image_type === "main");

  function update(next: MediaItem[]) {
    onChange(normaliseMedia(next));
  }
  const patch = (key: string, fields: Partial<MediaItem>) => update(items.map((i) => (i.key === key ? { ...i, ...fields } : i)));

  function setMain(url: string) {
    if (!url) return update(items.filter((i) => i.image_type !== "main"));
    if (main) return patch(main.key, { url, id: undefined });
    update([{ key: newKey(), media_type: "image", image_type: "main", url, alt_text: productName, is_primary: false }, ...items]);
  }

  async function upload(bucket: "product-images" | "product-videos", folder: string, file: File) {
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || (file.type.split("/")[1] ?? "bin");
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) {
      throw new Error(
        /bucket not found/i.test(uploadError.message)
          ? "Uploads aren't set up yet. Run supabase/migrations/0036_product_media.sql in the Supabase SQL editor."
          : uploadError.message
      );
    }
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  async function addImages(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    const type = pickType.current;
    const added: MediaItem[] = [];
    for (const file of Array.from(files)) {
      if (!IMAGE_TYPES.includes(file.type)) return setError(`${file.name}: choose a PNG, JPG or WebP image.`);
      if (file.size > IMAGE_MAX) return setError(`${file.name}: image must be smaller than 10MB.`);
    }
    try {
      for (const file of Array.from(files)) {
        setBusy(`Uploading ${file.name}…`);
        const url = await upload("product-images", "products", file);
        added.push({ key: newKey(), media_type: "image", image_type: type, url, alt_text: productName, is_primary: false });
      }
      update([...items, ...added]);
    } catch (e) {
      if (added.length) update([...items, ...added]);
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(null);
    }
  }

  async function addVideoFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!VIDEO_TYPES.includes(file.type)) return setError("Choose an MP4 or WebM video.");
    if (file.size > VIDEO_MAX) return setError("Video must be smaller than 50MB. For longer videos paste a YouTube link instead.");
    try {
      setBusy(`Uploading ${file.name}…`);
      const url = await upload("product-videos", "products", file);
      update([...items.filter((i) => i.media_type !== "video"), { key: newKey(), media_type: "video", image_type: "video", url, alt_text: productName, is_primary: false }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(null);
    }
  }

  function addVideoUrl() {
    setError(null);
    const url = videoUrl.trim();
    if (!/^https?:\/\//i.test(url)) return setError("Paste a full video link starting with https://");
    update([...items.filter((i) => i.media_type !== "video"), { key: newKey(), media_type: "video", image_type: "video", url, alt_text: productName, is_primary: false }]);
    setVideoUrl("");
  }

  function move(key: string, dir: -1 | 1) {
    const idx = items.findIndex((i) => i.key === key);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= items.length) return;
    const next = [...items];
    [next[idx], next[target]] = [next[target], next[idx]];
    update(next);
  }

  function addButton(type: ImageType, label: string) {
    return (
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => {
          pickType.current = type;
          imageInput.current?.click();
        }}
        className="rounded-lg border border-btn-secondary-border bg-white px-3 py-2 text-sm font-semibold text-btn-secondary-text hover:bg-surface disabled:opacity-60"
      >
        {label}
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className={fieldLabel}>Main image</p>
        <div className="mt-1">
          <ProductImageUploader value={main?.url ?? ""} onChange={setMain} />
        </div>
      </div>

      <div>
        <p className={fieldLabel}>Add more images</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {addButton("gallery", "+ Gallery images")}
          {addButton("label", "+ Label image")}
          {addButton("technical", "+ Technical / spec image")}
          <input
            ref={imageInput}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              void addImages(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
        <p className={`${helperText} mt-1`}>These upload exactly as chosen (no background removal or watermark), so labels and specs stay readable. PNG, JPG or WebP, up to 10MB each.</p>
      </div>

      {images.length > 0 && (
        <ul className="divide-y divide-card rounded-lg border border-card">
          {images.map((i) => {
            const idx = items.findIndex((x) => x.key === i.key);
            return (
              <li key={i.key} className="flex flex-wrap items-center gap-3 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={i.url} alt="" className="h-14 w-14 shrink-0 rounded border border-input bg-white object-contain" />
                <div className="min-w-40 flex-1 space-y-1.5">
                  {i.image_type === "main" ? (
                    <span className="text-xs font-bold uppercase tracking-wide text-muted">{TYPE_LABEL.main}</span>
                  ) : (
                    <select
                      aria-label="Image type"
                      className={`${inputBase} py-1.5`}
                      value={i.image_type}
                      onChange={(e) => patch(i.key, { image_type: e.target.value as ImageType })}
                    >
                      <option value="gallery">{TYPE_LABEL.gallery}</option>
                      <option value="label">{TYPE_LABEL.label}</option>
                      <option value="technical">{TYPE_LABEL.technical}</option>
                    </select>
                  )}
                  <input
                    aria-label="Alt text"
                    className={`${inputBase} py-1.5`}
                    placeholder="Alt text (describes the image)"
                    value={i.alt_text}
                    onChange={(e) => patch(i.key, { alt_text: e.target.value })}
                  />
                </div>
                <label className="flex items-center gap-1.5 text-sm text-ink">
                  <input type="radio" name="primary-image" checked={i.is_primary} onChange={() => update(items.map((x) => ({ ...x, is_primary: x.key === i.key })))} className="h-4 w-4 accent-primary" />
                  Primary
                </label>
                <div className="flex items-center gap-1 text-sm font-semibold">
                  <button type="button" aria-label="Move up" disabled={idx <= 0} onClick={() => move(i.key, -1)} className="rounded border border-input px-2 py-1 disabled:opacity-30">
                    ↑
                  </button>
                  <button type="button" aria-label="Move down" disabled={idx >= items.length - 1} onClick={() => move(i.key, 1)} className="rounded border border-input px-2 py-1 disabled:opacity-30">
                    ↓
                  </button>
                  <button type="button" onClick={() => update(items.filter((x) => x.key !== i.key))} className="px-2 py-1 text-error hover:underline">
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div>
        <p className={fieldLabel}>Product video</p>
        {video ? (
          <div className="mt-1 flex flex-wrap items-center gap-3 rounded-lg border border-card p-3">
            <div className="min-w-40 flex-1 space-y-1.5">
              <p className="break-all text-xs text-muted">{video.url}</p>
              <input
                aria-label="Video title"
                className={`${inputBase} py-1.5`}
                placeholder="Video title / alt text"
                value={video.alt_text}
                onChange={(e) => patch(video.key, { alt_text: e.target.value })}
              />
            </div>
            <button type="button" onClick={() => update(items.filter((x) => x.media_type !== "video"))} className="text-sm font-semibold text-error hover:underline">
              Remove
            </button>
          </div>
        ) : (
          <div className="mt-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => videoInput.current?.click()}
                className="rounded-lg border border-btn-secondary-border bg-white px-3 py-2 text-sm font-semibold text-btn-secondary-text hover:bg-surface disabled:opacity-60"
              >
                Upload video
              </button>
              <input
                ref={videoInput}
                type="file"
                accept="video/mp4,video/webm"
                className="hidden"
                onChange={(e) => {
                  void addVideoFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <span className="text-xs text-muted">or</span>
              <input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="Paste a YouTube or video link"
                className={`${inputBase} max-w-xs py-2`}
              />
              <button type="button" onClick={addVideoUrl} disabled={!videoUrl.trim()} className="rounded-lg border border-btn-secondary-border px-3 py-2 text-sm font-semibold disabled:opacity-40">
                Add link
              </button>
            </div>
            <p className={helperText}>MP4 or WebM up to 50MB, or a YouTube link for longer videos.</p>
          </div>
        )}
      </div>

      {busy && <p className="text-sm font-medium text-accent">{busy}</p>}
      {error && (
        <p role="alert" className="text-sm font-semibold text-error">
          {error}
        </p>
      )}
    </div>
  );
}

export async function loadProductMedia(partId: string): Promise<MediaItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("product_media").select("*").eq("part_id", partId).order("sort_order").order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    key: String(r.id),
    id: String(r.id),
    media_type: r.media_type as MediaItem["media_type"],
    image_type: r.image_type as MediaItem["image_type"],
    url: String(r.url),
    alt_text: String(r.alt_text ?? ""),
    is_primary: r.is_primary === true,
  }));
}

// Writes the edited media list for a product: removes deleted rows, clears the old primary
// flag first (only one primary is allowed), updates/inserts in order, then sets the primary.
export async function saveProductMedia(partId: string, items: MediaItem[], originalIds: string[]): Promise<string | null> {
  const supabase = createClient();
  const normalised = normaliseMedia(items);
  const keep = new Set(normalised.map((i) => i.id).filter(Boolean) as string[]);
  const removed = originalIds.filter((id) => !keep.has(id));
  if (removed.length) {
    const { error } = await supabase.from("product_media").delete().in("id", removed);
    if (error) return error.message;
  }
  const { error: clearError } = await supabase.from("product_media").update({ is_primary: false }).eq("part_id", partId).eq("is_primary", true);
  if (clearError) return clearError.message;

  let primaryId: string | null = null;
  for (let index = 0; index < normalised.length; index++) {
    const item = normalised[index];
    const fields = { image_type: item.image_type, alt_text: item.alt_text.trim() || null, sort_order: index };
    let id = item.id ?? null;
    if (id) {
      const { error } = await supabase.from("product_media").update(fields).eq("id", id);
      if (error) return error.message;
    } else {
      const { data, error } = await supabase
        .from("product_media")
        .insert({ ...fields, part_id: partId, media_type: item.media_type, url: item.url, is_primary: false })
        .select("id")
        .single();
      if (error) return error.message;
      id = String(data.id);
    }
    if (item.is_primary) primaryId = id;
  }
  if (primaryId) {
    const { error } = await supabase.from("product_media").update({ is_primary: true }).eq("id", primaryId);
    if (error) return error.message;
  }
  if (!normalised.some((i) => i.media_type === "image")) {
    const { error } = await supabase.from("parts").update({ image_url: null }).eq("id", partId);
    if (error) return error.message;
  }
  return null;
}
