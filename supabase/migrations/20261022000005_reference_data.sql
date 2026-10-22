-- Launch school: Arizona State University. Adding a campus later is just another
-- insert here (domains + neighbourhoods) — no code changes required.

insert into public.schools (id, name, short_name, email_domains, timezone)
values ('asu', 'Arizona State University', 'ASU', array['asu.edu'], 'America/Phoenix')
on conflict (id) do update
  set name = excluded.name,
      short_name = excluded.short_name,
      email_domains = excluded.email_domains,
      timezone = excluded.timezone;

insert into public.areas (school_id, slug, name, description, sort_order) values
  ('asu', 'tempe-campus',     'Tempe — near campus',  'Walk or bike to class. University Dr, Apache & Mill Ave.', 1),
  ('asu', 'tempe-south',      'South Tempe',          'Quieter, more space. Baseline, Elliot & Warner corridors.', 2),
  ('asu', 'downtown-phoenix', 'Downtown Phoenix',     'Near the Downtown campus and the light rail.',              3),
  ('asu', 'mesa',             'Mesa',                 'Lower rents along the light rail and Main St.',            4),
  ('asu', 'scottsdale',       'Scottsdale',           'Old Town and south Scottsdale, close to Tempe.',           5),
  ('asu', 'chandler-gilbert', 'Chandler & Gilbert',   'Suburban, near the Polytechnic campus.',                   6),
  ('asu', 'west-valley',      'West Valley',          'Glendale and the West Valley campus.',                     7),
  ('asu', 'central-phoenix',  'Central Phoenix',      'Midtown and Roosevelt Row, light-rail connected.',         8)
on conflict (school_id, slug) do update
  set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;
