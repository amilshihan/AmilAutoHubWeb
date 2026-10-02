"use client";

import { useState } from "react";
import type { CollectionSlug } from "@/lib/shop/collections";
import type { PublicMedia } from "@/lib/shop/types";
import ProductVisual from "@/components/shop/ProductVisual";

const TYPE_CAPTION: Partial<Record<PublicMedia["imageType"], string>> = {
  label: "Label",
  technical: "Specs",
};

function youtubeId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    let id: string | null = null;
    if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
    else if (host === "youtube.com" || host === "m.youtube.com") {
      if (u.pathname === "/watch") id = u.searchParams.get("v");
      else {
        const m = u.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/);
        id = m ? m[1] : null;
      }
    }
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

function VideoPlayer({ media, name }: { media: PublicMedia; name: string }) {
  const yt = youtubeId(media.url);
  if (yt) {
    return (
      <iframe
        title={media.alt ?? `${name} video`}
        src={`https://www.youtube-nocookie.com/embed/${yt}`}
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="h-full w-full border-0"
      />
    );
  }
  if (/\.(mp4|webm)(\?|$)/i.test(media.url)) {
    return <video src={media.url} controls preload="metadata" playsInline className="h-full w-full bg-black object-contain" aria-label={media.alt ?? `${name} video`} />;
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-surface p-6 text-center">
      <a href={media.url} target="_blank" rel="noopener noreferrer" className="font-bold text-charcoal underline">
        Watch the product video
      </a>
    </div>
  );
}

export default function ProductGallery({
  media,
  name,
  brand,
  collection,
  fallbackImageUrl,
  children,
}: {
  media: PublicMedia[];
  name: string;
  brand: string | null;
  collection: CollectionSlug;
  fallbackImageUrl: string | null;
  children?: React.ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const items = media.length > 0 ? media : [];
  const current = items[Math.min(index, Math.max(items.length - 1, 0))];

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-charcoal/10 bg-white">
        {!current ? (
          <ProductVisual imageUrl={fallbackImageUrl} name={name} brand={brand} collection={collection} />
        ) : current.mediaType === "video" ? (
          <VideoPlayer media={current} name={name} />
        ) : current.imageType === "label" || current.imageType === "technical" ? (
          // Labels and spec sheets are shown plain so the text stays readable.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current.url} alt={current.alt ?? `${name} ${TYPE_CAPTION[current.imageType]?.toLowerCase()}`} className="h-full w-full object-contain" />
        ) : (
          <ProductVisual imageUrl={current.url} name={current.alt ?? name} brand={brand} collection={collection} />
        )}
        {children}
      </div>

      {items.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1" aria-label="Product images and video">
          {items.map((m, i) => (
            <li key={m.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={m.mediaType === "video" ? "Play product video" : (m.alt ?? `Image ${i + 1}`)}
                aria-current={i === index}
                className={`relative block h-16 w-16 overflow-hidden rounded-lg border-2 bg-white sm:h-20 sm:w-20 ${i === index ? "border-charcoal" : "border-charcoal/10 hover:border-charcoal/40"}`}
              >
                {m.mediaType === "video" ? (
                  <span className="flex h-full w-full items-center justify-center bg-charcoal text-xl text-amil">▶</span>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt="" loading="lazy" className="h-full w-full object-contain" />
                )}
                {TYPE_CAPTION[m.imageType] && (
                  <span className="absolute inset-x-0 bottom-0 bg-charcoal/80 py-0.5 text-center text-[9px] font-bold uppercase tracking-wide text-white">
                    {TYPE_CAPTION[m.imageType]}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
