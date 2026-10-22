"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

const createSchema = z.object({
  name: z.string().min(2).max(60),
  maxMembers: z.number().int().min(2).max(4).default(4),
});

export async function createGroup(input: unknown) {
  const data = createSchema.parse(input);
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", user.id)
    .maybeSingle();

  const { data: group, error } = await supabase
    .from("groups")
    .insert({
      name: data.name.trim(),
      created_by: user.id,
      school_id: profile?.school_id ?? null,
      max_members: data.maxMembers,
      status: "forming",
    })
    .select("id")
    .single();

  if (error || !group) return { error: error?.message ?? "Could not create group" };

  await supabase.from("group_members").insert({
    group_id: group.id,
    user_id: user.id,
    role: "owner",
  });

  await supabase.from("group_housing_prefs").insert({ group_id: group.id });

  revalidatePath("/groups");
  return { groupId: group.id };
}

export async function inviteToGroup(groupId: string, userId: string) {
  const { supabase, user } = await requireUser();

  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || membership.role !== "owner") return { error: "Only owners can invite." };

  const { data: group } = await supabase.from("groups").select("max_members").eq("id", groupId).single();
  const { count } = await supabase
    .from("group_members")
    .select("*", { count: "exact", head: true })
    .eq("group_id", groupId);

  if ((count ?? 0) >= (group?.max_members ?? 4)) return { error: "Group is full." };

  const { error } = await supabase.from("group_members").insert({
    group_id: groupId,
    user_id: userId,
    role: "member",
  });
  if (error) return { error: error.message };

  const [a, b] = user.id < userId ? [user.id, userId] : [userId, user.id];
  await supabase.from("connection_edges").upsert(
    {
      user_a: a,
      user_b: b,
      source: "group_mate",
      strength: 2,
      meta: { group_id: groupId },
    },
    { onConflict: "user_a,user_b,source" },
  );

  await supabase.from("notifications").insert({
    user_id: userId,
    type: "group_invite",
    title: "Added to a group",
    body: "You’ve been added to a roommate group.",
    href: `/groups/${groupId}`,
    meta: { group_id: groupId },
  });

  revalidatePath(`/groups/${groupId}`);
  return { ok: true };
}

export async function leaveGroup(groupId: string) {
  const { supabase, user } = await requireUser();
  await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", user.id);
  revalidatePath("/groups");
  return { ok: true };
}

const housingSchema = z.object({
  groupId: z.string().uuid(),
  budgetMin: z.number().int(),
  budgetMax: z.number().int(),
  preferredAreas: z.array(z.string()),
  moveInDate: z.string().nullable().optional(),
  bedroomsWanted: z.number().int().min(1).max(4),
});

export async function updateGroupHousing(input: unknown) {
  const data = housingSchema.parse(input);
  const { supabase, user } = await requireUser();

  const { data: membership } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", data.groupId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return { error: "Not a member." };

  const { error } = await supabase.from("group_housing_prefs").upsert({
    group_id: data.groupId,
    budget_min: data.budgetMin,
    budget_max: data.budgetMax,
    preferred_areas: data.preferredAreas,
    move_in_date: data.moveInDate ?? null,
    bedrooms_wanted: data.bedroomsWanted,
  });
  if (error) return { error: error.message };
  revalidatePath(`/groups/${data.groupId}`);
  return { ok: true };
}
