import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { selectAll, selectByIds } from "@/lib/supabase/paginate";
import { photoUrl } from "@/lib/photos";
import { decrypt } from "@/lib/crypto";

/**
 * Everything Rumi stores about one student, as plain data (0.2 data export).
 *
 * - `student`: the student's own download. Chats include the other people's messages, since
 *   they're part of conversations the student was in.
 * - `staff`: a housing office's data-subject request. Only the student's own messages are
 *   included, never other people's.
 *
 * Never exported: third-party tokens, encrypted columns (phone and student ID are shown in
 * their display form), reports filed about the student, and staff notes about them.
 */
export async function collectAccountData(userId: string, mode: "student" | "staff") {
  const db = createAdminClient();
  const id = userId;
  const one = async <T>(q: PromiseLike<{ data: T | null }>) => (await q).data;
  const all = <T>(
    build: (
      from: number,
      to: number,
    ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  ) => selectAll(build);

  const [{ data: authUser }, profile, settings, preferences, spotify, music] = await Promise.all([
    db.auth.admin.getUserById(id),
    one(db.from("profiles").select("*").eq("id", id).maybeSingle()),
    one(db.from("user_settings").select("*").eq("user_id", id).maybeSingle()),
    one(db.from("preferences").select("*").eq("user_id", id).maybeSingle()),
    one(
      db
        .from("spotify_accounts")
        .select("spotify_user_id, display_name, scopes, connected_at, last_synced_at")
        .eq("user_id", id)
        .maybeSingle(),
    ),
    one(
      db
        .from("music_profiles")
        .select("top_artists, top_genres, synced_at")
        .eq("user_id", id)
        .maybeSingle(),
    ),
  ]);

  // Connection status only: OAuth tokens and feed links are secrets and stay out of exports.
  const [calendars, classSchedule] = await Promise.all([
    all((f, t) =>
      db
        .from("calendar_accounts")
        .select("provider, scope, last_sync_at, last_error, created_at")
        .eq("user_id", id)
        .order("provider")
        .range(f, t),
    ),
    one(
      db
        .from("class_schedules")
        .select("source, blocks, last_sync_at, updated_at")
        .eq("user_id", id)
        .maybeSingle(),
    ),
  ]);

  const [
    photos,
    media,
    matches,
    saves,
    blocks,
    introsSent,
    introsReceived,
    groupMembership,
    groupRequests,
    memberships,
    notifications,
    notificationPrefs,
    consents,
    answers,
    flags,
    socialLinks,
    connections,
    familyShares,
    matchShares,
    reportsFiled,
    assignments,
    checkins,
    roomChanges,
    surveys,
    imported,
    accommodations,
    smsLog,
  ] = await Promise.all([
    all((f, t) =>
      db
        .from("photos")
        .select("id, storage_path, position, width, height, created_at")
        .eq("user_id", id)
        .order("position")
        .range(f, t),
    ),
    one(
      db
        .from("profile_media")
        .select("kind, mime_type, size_bytes, duration_s, transcript, status, created_at")
        .eq("user_id", id)
        .maybeSingle(),
    ),
    all((f, t) =>
      db
        .from("match_scores")
        .select("candidate_id, score, reasons, watchouts, breakdown, computed_at")
        .eq("viewer_id", id)
        .order("score", { ascending: false })
        .order("candidate_id")
        .range(f, t),
    ),
    all((f, t) =>
      db
        .from("saves")
        .select("target_id, created_at")
        .eq("user_id", id)
        .order("created_at")
        .range(f, t),
    ),
    all((f, t) =>
      db
        .from("blocks")
        .select("blocked_id, created_at")
        .eq("blocker_id", id)
        .order("created_at")
        .range(f, t),
    ),
    all((f, t) =>
      db.from("intros").select("*").eq("sender_id", id).order("created_at").range(f, t),
    ),
    all((f, t) =>
      db.from("intros").select("*").eq("recipient_id", id).order("created_at").range(f, t),
    ),
    all((f, t) =>
      db
        .from("group_members")
        .select("group_id, role, joined_at, groups(*)")
        .eq("user_id", id)
        .order("joined_at")
        .range(f, t),
    ),
    all((f, t) =>
      db
        .from("group_requests")
        .select("*")
        .or(`user_id.eq.${id},created_by.eq.${id}`)
        .order("created_at")
        .range(f, t),
    ),
    all((f, t) =>
      db
        .from("conversation_members")
        .select(
          "conversation_id, joined_at, last_read_at, conversations(kind, group_id, created_at)",
        )
        .eq("user_id", id)
        .order("conversation_id")
        .range(f, t),
    ),
    all((f, t) =>
      db
        .from("notifications")
        .select("type, title, body, href, read_at, created_at")
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .range(f, t),
    ),
    all((f, t) =>
      db
        .from("notification_preferences")
        .select("kind, in_app, email, sms, push, updated_at")
        .eq("user_id", id)
        .order("kind")
        .range(f, t),
    ),
    all((f, t) =>
      db
        .from("consents")
        .select("kind, version, granted_at, revoked_at")
        .eq("user_id", id)
        .order("granted_at")
        .range(f, t),
    ),
    all((f, t) =>
      db
        .from("school_question_answers")
        .select("question_key, question_version, choice_key, updated_at")
        .eq("user_id", id)
        .order("question_key")
        .range(f, t),
    ),
    all((f, t) =>
      db
        .from("preference_flags")
        .select("rule_key, created_at, dismissed_at")
        .eq("user_id", id)
        .order("rule_key")
        .range(f, t),
    ),
    all((f, t) =>
      db
        .from("social_links")
        .select("platform, handle, verified_at, created_at")
        .eq("user_id", id)
        .order("platform")
        .range(f, t),
    ),
    all((f, t) =>
      db
        .from("connections")
        .select("user_a, user_b, source, status, confirmed_at, created_at")
        .or(`user_a.eq.${id},user_b.eq.${id}`)
        .order("created_at")
        .range(f, t),
    ),
    all((f, t) =>
      db
        .from("family_shares")
        .select("scope, expires_at, revoked_at, created_at")
        .eq("user_id", id)
        .order("created_at")
        .range(f, t),
    ),
    all((f, t) =>
      db
        .from("match_share_tokens")
        .select(
          "user_a, user_b, user_a_consented, user_b_consented, expires_at, revoked_at, created_at",
        )
        .or(`user_a.eq.${id},user_b.eq.${id}`)
        .order("created_at")
        .range(f, t),
    ),
    all((f, t) =>
      db
        .from("reports")
        .select("reported_id, reason, details, status, created_at")
        .eq("reporter_id", id)
        .eq("source", "user")
        .order("created_at")
        .range(f, t),
    ),
    all((f, t) =>
      db
        .from("assignments")
        .select("building, room, bed, source, moved_in_at, closed_at, created_at")
        .eq("user_id", id)
        .order("created_at")
        .range(f, t),
    ),
    all((f, t) =>
      db
        .from("checkins")
        .select("due_on, score, tags, note_enc, share_with_ra, ask_ra, submitted_at")
        .eq("user_id", id)
        .order("due_on")
        .range(f, t),
    ),
    all((f, t) =>
      db
        .from("room_change_requests")
        .select("building, reason_keys, student_note, status, source, created_at, closed_at")
        .eq("user_id", id)
        .order("created_at")
        .range(f, t),
    ),
    all((f, t) =>
      db
        .from("outcome_surveys")
        .select("term_id, room_again, score, friction_tags, biggest_win, created_at")
        .eq("user_id", id)
        .order("created_at")
        .range(f, t),
    ),
    all((f, t) =>
      db
        .from("imported_answers")
        .select(
          "source, question_code, raw_value, mapped_factor, mapped_value, confirmed_at, dismissed_at, created_at",
        )
        .eq("user_id", id)
        .order("created_at")
        .range(f, t),
    ),
    all((f, t) =>
      db
        .from("accommodation_constraints")
        .select("constraint_key, expires_on, legal_hold, created_at")
        .eq("user_id", id)
        .order("created_at")
        .range(f, t),
    ),
    all((f, t) =>
      db
        .from("sms_messages")
        .select("direction, kind, status, created_at")
        .eq("user_id", id)
        .order("created_at")
        .range(f, t),
    ),
  ]);

  // Chats: messages read a conversation at a time so a long history isn't cut off.
  const conversationIds = memberships.map((m) => m.conversation_id);
  const messages = await selectByIds(
    conversationIds,
    (chunk, f, t) =>
      db
        .from("messages")
        .select("id, conversation_id, sender_id, kind, body, created_at")
        .in("conversation_id", chunk)
        .order("created_at")
        .order("id")
        .range(f, t),
    40,
  );

  // Room life in the student's groups: agreements, their own events, chores and money.
  const groupIds = groupMembership.map((g) => g.group_id);
  const [agreements, roomEvents, chores, expensesPaid, splits, settlements] = await Promise.all([
    selectByIds(groupIds, (chunk, f, t) =>
      db
        .from("agreements")
        .select(
          "id, group_id, version, status, signed_at, created_at, agreement_sections(key, title, content, accepted_by), agreement_signatures(user_id, typed_name, signed_at, version)",
        )
        .in("group_id", chunk)
        .order("id")
        .range(f, t),
    ),
    all((f, t) =>
      db
        .from("room_events")
        .select(
          "group_id, kind, title, starts_at, ends_at, overnight, guest_count, rrule, notes, created_at",
        )
        .eq("created_by", id)
        .order("created_at")
        .range(f, t),
    ),
    all((f, t) =>
      db
        .from("chore_instances")
        .select("group_id, due_on, completed_at, chores(title, cadence)")
        .eq("assignee_id", id)
        .order("due_on")
        .range(f, t),
    ),
    all((f, t) =>
      db
        .from("expenses")
        .select("group_id, amount_cents, currency, description, deleted_at, created_at")
        .eq("payer_id", id)
        .order("created_at")
        .range(f, t),
    ),
    all((f, t) =>
      db
        .from("expense_splits")
        .select("expense_id, share_cents, expenses(group_id, description, created_at)")
        .eq("user_id", id)
        .order("expense_id")
        .range(f, t),
    ),
    all((f, t) =>
      db
        .from("settlements")
        .select("group_id, payer_id, receiver_id, amount_cents, note, created_at")
        .or(`payer_id.eq.${id},receiver_id.eq.${id}`)
        .order("created_at")
        .range(f, t),
    ),
  ]);
  const comments = await selectByIds(
    agreements.map((a) => a.id),
    (chunk, f, t) =>
      db
        .from("agreement_comments")
        .select("agreement_id, section_key, body, created_at")
        .in("agreement_id", chunk)
        .eq("author_id", id)
        .order("created_at")
        .range(f, t),
  );

  const safeSettings = settings
    ? (({ phone_enc: _p, phone_hash: _h, student_id_enc: _s, ...rest }) => rest)(
        settings as Record<string, unknown> & {
          phone_enc?: unknown;
          phone_hash?: unknown;
          student_id_enc?: unknown;
        },
      )
    : null;
  const note = (enc: string | null) => {
    if (!enc) return null;
    try {
      return decrypt(enc);
    } catch {
      return "(note could not be decrypted)";
    }
  };

  return {
    exported_at: new Date().toISOString(),
    export_kind:
      mode === "staff"
        ? "Housing office data request (other people's messages excluded)"
        : "Your Rumi data",
    account: {
      id,
      email: authUser?.user?.email ?? null,
      created_at: authUser?.user?.created_at ?? null,
      last_sign_in_at: authUser?.user?.last_sign_in_at ?? null,
    },
    profile,
    settings: safeSettings,
    preferences,
    photos: photos.map((p) => ({ ...p, url: photoUrl(p.storage_path) })),
    intro_media: media,
    spotify,
    calendar_connections: calendars,
    class_schedule: classSchedule,
    music,
    consents,
    notification_preferences: notificationPrefs,
    matches,
    saved_profiles: saves,
    blocked_profiles: blocks,
    intros: { sent: introsSent, received: introsReceived },
    groups: { memberships: groupMembership, requests: groupRequests },
    conversations: memberships.map((m) => ({
      ...m,
      messages: messages
        .filter(
          (msg) =>
            msg.conversation_id === m.conversation_id &&
            (mode === "student" || msg.sender_id === id),
        )
        .map(({ conversation_id: _c, id: _m, ...msg }) => ({
          ...msg,
          from_you: msg.sender_id === id,
        })),
    })),
    school_questions: answers,
    consistency_prompts: flags,
    social_links: socialLinks,
    connections,
    family_links: familyShares,
    match_cards: matchShares,
    agreements: agreements.map((a) => ({
      ...a,
      your_comments: comments.filter((c) => c.agreement_id === a.id),
    })),
    room_calendar_events: roomEvents,
    chores,
    expenses: { paid: expensesPaid, shares: splits, settlements },
    housing: {
      assignments,
      check_ins: checkins.map(({ note_enc, ...c }) => ({ ...c, note: note(note_enc) })),
      room_change_requests: roomChanges,
      end_of_term_surveys: surveys,
      imported_answers: imported,
      accommodations: accommodations.map((a) => ({ ...a, note: "Kept by your housing office" })),
    },
    notifications,
    text_messages: smsLog,
    reports_filed: reportsFiled,
  };
}
