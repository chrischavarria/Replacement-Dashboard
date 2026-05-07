# Replacement Error Dashboard

A clean shared dashboard for tracking replacements caused by technician errors on the original order.

## Open locally

Open `index.html` in a browser. Without Supabase configured, the dashboard runs with browser-local demo data so you can test the workflow immediately.

## Connect Supabase

1. Create a Supabase project.
2. Open the SQL editor and run `supabase-schema.sql`.
3. Open the dashboard and scroll to **Supabase setup**.
4. Paste your project URL and anon key.
5. Host the folder anywhere static files can be served.

The included policies allow anyone with the link and anon key to read dashboard metrics, add technicians, add reasons, and submit replacement entries.

## Tables

- `replacement_technicians`: technician names.
- `replacement_reasons`: replacement error reasons.
- `replacement_entries`: submitted replacement records connected to one technician and one reason.

## Notes

The anon key is intended for browser use, but access is controlled by Row Level Security policies. If you want only approved people to edit entries, tighten the insert/delete policies and add Supabase Auth.
