-- Phase 9 white-label: a public bucket for school logos. Only the service role writes to it
-- (the staff action checks the housing-admin role first), so there are no write policies;
-- public buckets serve objects by URL without a select policy.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('school-branding', 'school-branding', true, 524288, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
