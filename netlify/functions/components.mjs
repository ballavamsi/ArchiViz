/**
 * Netlify Function: GET /api/components
 * Serves the component definitions and categories server-side so they are
 * never bundled into the client JS (protects palette schema & business logic).
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(fileURLToPath(import.meta.url), '../../../');

export default async (req) => {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    // Dynamically import the source module so we get the live ES export values
    const mod = await import(`file://${root}/src/components.js`);

    // Strip raw SVG icon strings from COMPONENT_DEFS to reduce payload.
    // The client already has icon rendering inline via ICONS map in app.js.
    const defs = (mod.COMPONENT_DEFS || []).map(d => {
      const { icon, ...rest } = d; // eslint-disable-line no-unused-vars
      return rest;
    });

    const payload = {
      defs,
      categories: mod.CATEGORIES || [],
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    console.error('[/api/components]', err);
    return new Response(JSON.stringify({ error: 'Failed to load components' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const config = { path: '/api/components' };
