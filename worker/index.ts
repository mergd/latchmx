import { proxyRequest } from '../src/lib/server-proxy';

type Env = {
  ASSETS: Fetcher;
  BMX_API_ORIGIN: string;
  BMX_ACCOUNTS_ORIGIN: string;
  BMX_CLIENT_ID?: string;
  BMX_CLIENT_SECRET?: string;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/bmx')) {
      return proxyRequest(request, env.BMX_API_ORIGIN, '/api/bmx');
    }

    if (url.pathname.startsWith('/api/accounts')) {
      return proxyAccounts(request, env);
    }

    if (url.pathname === '/dev-session.json') {
      return new Response(null, { status: 404 });
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

async function proxyAccounts(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (
    request.method === 'POST' &&
    url.pathname === '/api/accounts/oauth/token' &&
    env.BMX_CLIENT_ID &&
    env.BMX_CLIENT_SECRET
  ) {
    const params = new URLSearchParams(await request.text());
    params.set('client_id', env.BMX_CLIENT_ID);
    params.set('client_secret', env.BMX_CLIENT_SECRET);
    const headers = new Headers();
    const authorization = request.headers.get('authorization');
    if (authorization) {
      headers.set('Authorization', authorization);
    }
    headers.set('Content-Type', 'application/x-www-form-urlencoded');
    const upstream = await fetch(`${env.BMX_ACCOUNTS_ORIGIN}/oauth/token`, {
      method: 'POST',
      headers,
      body: params,
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: contentTypeHeaders(upstream),
    });
  }

  return proxyRequest(request, env.BMX_ACCOUNTS_ORIGIN, '/api/accounts');
}

function contentTypeHeaders(upstream: Response): Headers {
  const headers = new Headers();
  const contentType = upstream.headers.get('content-type');
  if (contentType) {
    headers.set('Content-Type', contentType);
  }
  return headers;
}
