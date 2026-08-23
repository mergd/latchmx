import { proxyAccountsRequest, proxyRequest } from '../src/lib/server-proxy';

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

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
