# Replacement Error Dashboard

A clean shared dashboard for tracking replacements caused by technician errors on the original order.

## Open locally

Open `index.html` in a browser. Without Supabase configured in `config.js`, the dashboard runs with browser-local demo data so you can test the workflow immediately.

## Connect Supabase

1. Create a Supabase project.
2. Open the SQL editor and run `supabase-schema.sql`.
3. Open `config.js`.
4. Paste your project URL into `supabaseUrl`.
5. Paste your anon public key into `supabaseAnonKey`.
6. Add a removal password into `technicianDeletePassword`.
7. Host the folder anywhere static files can be served.

The included policies allow anyone with the link to read dashboard metrics, add technicians, add reasons, and submit replacement entries.

## Tables

- `replacement_technicians`: technician names.
- `replacement_reasons`: replacement error reasons.
- `replacement_entries`: submitted replacement records connected to one technician and one reason.

## Notes

The anon key is intended for browser use, but access is controlled by Row Level Security policies. If you want only approved people to edit entries, tighten the insert/delete policies and add Supabase Auth.

The technician removal password only hides the delete action behind a browser prompt. Because this is a static site, it prevents casual dashboard edits but should not be treated as private security.
