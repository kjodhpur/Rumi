"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action";
import {
  calculateNextDueDate,
  DEFAULT_CHORE_TEMPLATES,
  getNextAssignee,
  type ChoreCadence,
} from "@/lib/chores/rotation";

const uuidSchema = z.string().uuid();

export async function seedDefaultChoresIfEmpty(
  groupId: string,
  memberIds: string[],
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in.");
  if (!uuidSchema.safeParse(groupId).success) return fail("Invalid group ID.");
  if (memberIds.length === 0) return ok();

  const supabase = createClient();

  const { data: existing } = await supabase
    .from("chores")
    .select("id")
    .eq("group_id", groupId)
    .limit(1);

  if (existing && existing.length > 0) {
    return ok();
  }

  for (let i = 0; i < DEFAULT_CHORE_TEMPLATES.length; i++) {
    const template = DEFAULT_CHORE_TEMPLATES[i];
    const assignee = memberIds[i % memberIds.length];
    const dueOn = calculateNextDueDate(new Date(), template.cadence);

    const { data: chore, error } = await supabase
      .from("chores")
      .insert({
        group_id: groupId,
        title: template.title,
        cadence: template.cadence,
        rotation: memberIds,
      })
      .select("id")
      .single();

    if (error || !chore) continue;

    await supabase.from("chore_instances").insert({
      chore_id: chore.id,
      group_id: groupId,
      assignee_id: assignee,
      due_on: dueOn,
    });
  }

  revalidatePath(`/groups/${groupId}/home`);
  return ok();
}

export async function createChore(
  groupId: string,
  title: string,
  cadence: ChoreCadence,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in.");
  if (!uuidSchema.safeParse(groupId).success) return fail("Invalid group ID.");
  if (!title.trim()) return fail("Chore title is required.");

  const supabase = createClient();

  // Load group members
  const { data: members, error: membersError } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId);

  if (membersError || !members) return fail("Could not load group members.");

  const memberIds = members.map((m) => m.user_id);
  const firstAssignee = memberIds[0] || user.id;
  const dueOn = calculateNextDueDate(new Date(), cadence);

  const { data: chore, error: insertError } = await supabase
    .from("chores")
    .insert({
      group_id: groupId,
      title: title.trim(),
      cadence,
      rotation: memberIds,
    })
    .select("id")
    .single();

  if (insertError || !chore) return fail(insertError?.message || "Failed to create chore.");

  await supabase.from("chore_instances").insert({
    chore_id: chore.id,
    group_id: groupId,
    assignee_id: firstAssignee,
    due_on: dueOn,
  });

  revalidatePath(`/groups/${groupId}/home`);
  return ok();
}

export async function completeChoreInstance(
  groupId: string,
  instanceId: string,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in.");
  if (!uuidSchema.safeParse(groupId).success || !uuidSchema.safeParse(instanceId).success) {
    return fail("Invalid ID.");
  }

  const supabase = createClient();

  const { data: instance, error: loadError } = await supabase
    .from("chore_instances")
    .select("id, chore_id, assignee_id, chores(cadence, rotation)")
    .eq("id", instanceId)
    .single();

  if (loadError || !instance) return fail("Chore instance not found.");

  const now = new Date().toISOString();
  const { error: completeError } = await supabase
    .from("chore_instances")
    .update({ completed_at: now })
    .eq("id", instanceId);

  if (completeError) return fail(completeError.message);

  // Generate next instance
  const chore = instance.chores as { cadence: ChoreCadence; rotation: string[] } | null;
  if (chore && chore.rotation && chore.rotation.length > 0) {
    const nextAssignee = getNextAssignee(chore.rotation, instance.assignee_id) || instance.assignee_id;
    const nextDue = calculateNextDueDate(new Date(), chore.cadence);

    await supabase.from("chore_instances").insert({
      chore_id: instance.chore_id,
      group_id: groupId,
      assignee_id: nextAssignee,
      due_on: nextDue,
    });
  }

  revalidatePath(`/groups/${groupId}/home`);
  return ok();
}
