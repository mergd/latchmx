import { proxyAccountsRequest, proxyRequest } from '../src/lib/server-proxy';

import type { Env } from './env';
import { HttpError, corsHeaders, json } from './http';
import { handleGuestRequest, handleKeysRequest } from './keys';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const headers = corsHeaders(request);

    if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
      return new Response(null, { status: 204, headers });
    }

    try {
      if (url.pathname.startsWith('/api/keys')) {
        return await handleKeysRequest(request, env, headers);
      }
      if (url.pathname.startsWith('/api/guest')) {
        return await handleGuestRequest(request, env, headers);
      }
    } catch (error) {
      if (error instanceof HttpError) {
        return json({ error: error.message }, error.status, headers);
      }
      const message =
        error instanceof Error ? error.message : 'Something went wrong.';
      return json({ error: message }, 500, headers);
    }

    if (url.pathname.startsWith('/api/bmx')) {
      return proxyRequest(request, env.BMX_API_ORIGIN, '/api/bmx');
    }

    if (url.pathname.startsWith('/api/accounts')) {
      return proxyAccountsRequest(
        request,
        env.BMX_ACCOUNTS_ORIGIN,
        env.BMX_CLIENT_ID,
        env.BMX_CLIENT_SECRET,
      );
    }

    if (url.pathname === '/dev-session.json') {
      return new Response(null, { status: 404 });
    }

    if (url.pathname.startsWith('/buildings/') && url.pathname.endsWith('.jpg')) {
      return serveBuildingImage(request, env);
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

async function serveBuildingImage(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const asset = await env.ASSETS.fetch(new Request(url, { method: 'GET' }));
  if (!asset.ok) {
    return asset;
  }
  const body = await asset.arrayBuffer();
  const headers = new Headers({
    'Content-Type': 'image/jpeg',
    'Content-Length': String(body.byteLength),
    'Cache-Control': 'public, max-age=86400',
    'Access-Control-Allow-Origin': '*',
  });
  if (request.method === 'HEAD') {
    return new Response(null, { status: 200, headers });
  }
  return new Response(body, { status: 200, headers });
}
