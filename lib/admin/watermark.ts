// Bakes the Amil Auto Hub logo diagonally into a product photo before it's uploaded.
// Browser-only (Canvas + Image APIs) — call from a "use client" component.

const LOGO_SRC = "/brand/amil-logo.png";
const MAX_DIM = 1600;
const WATERMARK_ANGLE_DEG = -28;
const WATERMARK_OPACITY = 0.22;
const WATERMARK_WIDTH_RATIO = 0.9; // fraction of the image's larger dimension

let cachedLogo: Promise<HTMLImageElement> | null = null;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

function loadLogo(): Promise<HTMLImageElement> {
  cachedLogo ??= loadImage(LOGO_SRC);
  return cachedLogo;
}

export async function addWatermark(sourceBlob: Blob): Promise<Blob> {
  const sourceUrl = URL.createObjectURL(sourceBlob);
  let source: HTMLImageElement;
  let logo: HTMLImageElement;
  try {
    [source, logo] = await Promise.all([loadImage(sourceUrl), loadLogo()]);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }

  const scale = Math.min(1, MAX_DIM / Math.max(source.naturalWidth, source.naturalHeight));
  const width = Math.max(1, Math.round(source.naturalWidth * scale));
  const height = Math.max(1, Math.round(source.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return sourceBlob;

  ctx.drawImage(source, 0, 0, width, height);

  const logoWidth = Math.max(width, height) * WATERMARK_WIDTH_RATIO;
  const logoHeight = logoWidth * (logo.naturalHeight / logo.naturalWidth);

  ctx.save();
  ctx.globalAlpha = WATERMARK_OPACITY;
  ctx.translate(width / 2, height / 2);
  ctx.rotate((WATERMARK_ANGLE_DEG * Math.PI) / 180);
  ctx.drawImage(logo, -logoWidth / 2, -logoHeight / 2, logoWidth, logoHeight);
  ctx.restore();

  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  return blob ?? sourceBlob;
}
