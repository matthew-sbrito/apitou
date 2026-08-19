-- Apitou — event geolocation.
-- Paste into the Supabase SQL Editor (or `supabase db push`) after
-- 0005_cascade_deletes.sql. Adds optional latitude/longitude to `events`
-- for the create/edit form's map picker. Independent of the existing
-- free-text `location` column — either, both, or neither may be set.
--
-- double precision (not numeric): matches the usual Postgres/PostGIS
-- convention for lat/lng — far more precision than GPS needs, with simpler
-- arithmetic than `numeric`. There's no exact-decimal requirement here
-- (unlike money), so `numeric`'s extra guarantees buy nothing.

alter table events
  add column latitude double precision,
  add column longitude double precision;
