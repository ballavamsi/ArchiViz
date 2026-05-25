/**
 * Netlify Function: GET /api/rules
 * Serves ARCH_RULES (connection validation map) server-side.
 * Keeps the topology rules out of the downloadable client bundle.
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(fileURLToPath(import.meta.url), '../../../');

export default async (req) => {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const mod = await import(`file://${root}/src/rules.js`);

    return new Response(JSON.stringify({ rules: mod.ARCH_RULES || {} }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    console.error('[/api/rules]', err);
    return new Response(JSON.stringify({ error: 'Failed to load rules' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const config = { path: '/api/rules' };
