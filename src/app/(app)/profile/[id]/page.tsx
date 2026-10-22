import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { loadProfileDetail } from "@/lib/profile";
import { ProfileView } from "@/components/profile/profile-view";
import { SwipeBack } from "@/components/motion/swipe-back";
import { displayName } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  if (!z.string().uuid().safeParse(params.id).success) return { title: "Profile" };
  const supabase = createClient();
  const { data } = await supabase.from("profiles").select("first_name, last_initial").eq("id", params.id).maybeSingle();
  return { title: data ? displayName(data.first_name, data.last_initial) : "Profile" };
}

export default async function ProfilePage({ params }: { params: { id: string } }) {
  if (!z.string().uuid().safeParse(params.id).success) notFound();
  const user = await getUser();
  const detail = await loadProfileDetail(createClient(), user!.id, params.id);
  if (!detail) notFound();

  return (
    <SwipeBack fallbackHref="/matches">
      <div className="pt-2 lg:pt-0">
        <ProfileView id={detail.id} detail={detail} mode="page" />
      </div>
    </SwipeBack>
  );
}
