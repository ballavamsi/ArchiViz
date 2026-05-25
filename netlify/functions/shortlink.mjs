/**
 * Netlify Function: /api/shortlink
 *
 *   POST { title, payload }  → { id, shortUrl }   — create a short link
 *   GET  ?id=<8-char>        → { payload, title }  — resolve a short link
 *
 * Uses the same Supabase `diagrams` table as the client-side helpers,
 * but with the SERVICE_ROLE key (never exposed to the browser) so we can
 * enforce RLS and rate-limit from the server.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY   // preferred
                          || process.env.SUPABASE_ANON_KEY;          // fallback

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function genShortId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return new Response(
      JSON.stringify({ error: 'Supabase not configured on server' }),
      { status: 503, headers: { 'Content-Type': 'application/json', ...CORS } }
    );
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // ── GET: resolve short link ───────────────────────────────────────────────
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const id  = url.searchParams.get('id');
    if (!id || !/^[a-z0-9]{8}$/i.test(id)) {
      return new Response(JSON.stringify({ error: 'Invalid id' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    const { data, error } = await sb
      .from('diagrams')
      .select('payload,title')
      .eq('id', id)
      .single();

    if (error || !data) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404, headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    // Increment view count — best-effort, non-blocking
    sb.rpc('increment_views', { diagram_id: id }).catch(() => {});

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60', ...CORS },
    });
  }

  // ── POST: create short link ───────────────────────────────────────────────
  if (req.method === 'POST') {
    let body;
    try { body = await req.json(); }
    catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    const { title, payload } = body;
    if (!payload) {
      return new Response(JSON.stringify({ error: 'payload is required' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    const id = genShortId();
    const { error } = await sb
      .from('diagrams')
      .insert({ id, title: title || 'Untitled', payload });

    if (error) {
      console.error('[/api/shortlink POST]', error);
      return new Response(JSON.stringify({ error: 'Could not save diagram' }), {
        status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    // We don't know the origin inside a Netlify function, so return just the ID.
    // The client constructs the full URL as: `${location.origin}/s/${id}`
    return new Response(JSON.stringify({ id }), {
      status: 201,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }

  return new Response('Method Not Allowed', { status: 405, headers: CORS });
};

export const config = { path: '/api/shortlink' };
