-- Phase 1.G: outcome-trained factor weights (research mode, staff-reviewed). See docs/phase-1-g.md.
-- scripts/fit-weights.ts writes suggested models with the service role. A housing admin may
-- adopt one as the school's default weights; it is never adopted automatically, and the
-- adoption is audited. Students' own weights still apply on top.

create table public.weight_models (
  id                uuid primary key default gen_random_uuid(),
  school_id         text not null references public.schools (id) on delete cascade,
  trained_on_terms  uuid[] not null default '{}',
  -- { "<factor>": { "coef": n, "low": n, "high": n } }
  coefficients      jsonb not null check (jsonb_typeof(coefficients) = 'object'),
  -- { "rows": n, "positives": n, "auc": n, "lambda": n }
  metrics           jsonb not null check (jsonb_typeof(metrics) = 'object'),
  -- Suggested default importance per factor (0–3)
  suggested_weights jsonb not null default '{}'::jsonb check (jsonb_typeof(suggested_weights) = 'object'),
  status            text not null default 'suggested' check (status in ('suggested', 'adopted', 'retired')),
  adopted_by        uuid references public.profiles (id) on delete set null,
  adopted_at        timestamptz,
  created_at        timestamptz not null default now()
);

create index weight_models_school_status_idx on public.weight_models (school_id, status);
create unique index weight_models_one_adopted_idx on public.weight_models (school_id) where status = 'adopted';

alter table public.weight_models enable row level security;
revoke all on public.weight_models from anon, authenticated;
grant select on public.weight_models to authenticated;

create policy "weight_models: staff read" on public.weight_models
  for select to authenticated using (public.has_role(school_id, array['housing_admin', 'housing_staff', 'analyst']));
