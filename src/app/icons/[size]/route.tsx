import { ImageResponse } from "next/og";
import { BrandMark } from "@/components/BrandMark";

export const dynamic = "force-static";
export function generateStaticParams() {
  return [{ size: "192" }, { size: "512" }];
}

export async function GET(_req: Request, ctx: { params: Promise<{ size: string }> }) {
  const { size } = await ctx.params;
  const n = size === "512" ? 512 : 192;
  return new ImageResponse(<BrandMark size={n} />, { width: n, height: n });
}
