import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { loadProfileDetail } from "@/lib/profile";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!z.string().uuid().safeParse(params.id).success) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const detail = await loadProfileDetail(createClient(), user.id, params.id);
  if (!detail) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(detail, { headers: { "Cache-Control": "private, no-store" } });
}
