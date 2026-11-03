# Phase 7.8 — Video & Voice Intro Clips

Written before code per master prompt §7.8.

## 1. Principles

- **Optional personal expression:** ≤ 30-second video or voice introduction clip recorded in-browser or uploaded.
- **Accessibility first:** A written transcript field is required alongside any video or audio clip for screen readers and deaf/hard-of-hearing students.
- **Privacy & Storage:**
  - Stored in private Supabase bucket `intros-media`.
  - Media files served exclusively through short-lived signed URLs to verified students authorized to view the profile.
- **Safety & Moderation:**
  - Max file size: 20 MB.
  - Formats: `video/mp4`, `video/webm`, `audio/mp4`, `audio/webm`, `audio/mpeg`.
  - Reportable: auto-hidden if reported 2 or more times pending staff moderation.
- **Acceptance:**
  - A profile without media remains 100% complete.
  - Video duration strictly enforced (≤ 30s).
  - Transcript always renders as accessible closed captions / text block.

## 2. Schema

```sql
create table public.profile_media (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  kind        text not null check (kind in ('video', 'audio')),
  path        text not null,
  duration_s  integer not null check (duration_s > 0 and duration_s <= 30),
  transcript  text not null check (char_length(transcript) between 3 and 1000),
  status      text not null default 'active' check (status in ('active', 'flagged', 'removed')),
  created_at  timestamptz not null default now(),
  unique (user_id)
);
```
