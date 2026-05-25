# Supabase Short Links — Setup Guide

## 1. Create a Supabase project (free)

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Pick a name (e.g. `archi-flow`), set a DB password, choose a region close to your users
3. Wait ~2 minutes for provisioning

## 2. Run the schema

1. In Supabase dashboard → **SQL Editor** → **New query**
2. Paste the contents of `supabase/schema.sql`
3. Click **Run** — you should see "Success"

## 3. Get your credentials

In Supabase → **Project Settings** → **API**:

| Setting | Where to find |
|---|---|
| `SUPABASE_URL` | "Project URL" — looks like `https://xxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | "Project API keys" → `anon` `public` key |

The `anon` key is safe to expose in the browser — Row Level Security policies
(already set up in schema.sql) ensure users can only read and insert, never
update or delete other people's diagrams.

## 4. Add env vars to Netlify

In Netlify → **Site settings** → **Environment variables** → **Add variable**:

```
SUPABASE_URL      = https://your-project-id.supabase.co
SUPABASE_ANON_KEY = eyJhbGci...your-anon-key...
```

Then **trigger a new deploy** (Deploys → Trigger deploy → Deploy site).

## 5. Test it

1. Open your Netlify site
2. Build a diagram → click **Share**
3. You should see a **"Permanent short link"** green box generating a URL like:
   `https://your-site.netlify.app/s/a3f8bc12`
4. Open that URL in a new tab — it should load the diagram

## How it works

```
User clicks Share
       ↓
saveShortLink() → generates 8-char ID → INSERT into Supabase diagrams table
       ↓
Returns yoursite.netlify.app/s/a3f8bc12
       ↓
Someone opens /s/a3f8bc12
       ↓
Netlify redirects to /index.html (SPA)
       ↓
loadFromShortPath() detects /s/[id] → SELECT from Supabase → importArchitecture()
```

## Free tier limits (more than enough)

| Resource | Free limit | Typical usage |
|---|---|---|
| Database rows | 500 MB | ~500,000 diagrams (each ~1 KB avg) |
| API requests | 500,000/month | 16,000 shares/day |
| Bandwidth | 5 GB/month | Fine for a new project |
| Projects | 2 free | You only need 1 |

## Security notes

- Anon key is public — this is by design (like a Firebase public API key)
- RLS policies enforce: anyone can read, anyone can insert, nobody can update/delete
- Max payload size is enforced at 512 KB in the insert policy
- Short IDs use a "no confusable characters" alphabet (no 0/O, 1/l)
- View counts increment via a `security definer` RPC — can't be manipulated by clients
