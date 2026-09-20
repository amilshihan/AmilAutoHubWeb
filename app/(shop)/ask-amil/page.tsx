import type { Metadata } from "next";
import AskAmilChat from "@/components/shop/AskAmilChat";

export const metadata: Metadata = {
  title: "Ask Amil",
  description: "Not sure what your vehicle needs? Ask Amil and get compatible product recommendations.",
};

export default async function AskAmilPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return <AskAmilChat initialQuestion={q?.slice(0, 300)} />;
}
