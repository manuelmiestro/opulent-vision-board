import { NextResponse } from "next/server";
import { features } from "@/lib/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(features);
}
