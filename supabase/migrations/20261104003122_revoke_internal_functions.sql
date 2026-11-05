-- Security fix. Supabase grants EXECUTE on new public functions to `authenticated` by
-- default, and earlier migrations only revoked from public/anon. Two internal helpers have
-- no caller check and must never be called by a signed-in user:
--   purge_audit_log  deletes audit rows (retention runs it with the service role)
--   school_students  returns whole profile rows for a school (service role and other
--                    security-definer functions only)
-- Revoking here does not affect definer functions that call them, which run as the owner.
revoke execute on function public.purge_audit_log(text, timestamptz) from authenticated;
revoke execute on function public.school_students(text) from authenticated;
