export async function proxyRequest(
  request: Request,
  upstreamOrigin: string,
  localPrefix: string,
): Promise<Response> {
  const incoming = new URL(request.url);
  const rest = incoming.pathname.startsWith(localPrefix)
    ? incoming.pathname.slice(localPrefix.length)
    : incoming.pathname;
  const target = new URL(`${rest}${incoming.search}`, upstreamOrigin);

  const headers = new Headers();
  const authorization = request.headers.get('authorization');
  if (authorization) {
    headers.set('Authorization', authorization);
  }
  const contentType = request.headers.get('content-type');
  if (contentType) {
    headers.set('Content-Type', contentType);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }

  const upstream = await fetch(target, init);
  const body = await upstream.arrayBuffer();
  return new Response(body, {
    status: upstream.status,
    headers: contentTypeHeaders(upstream),
  });
}

export async function proxyAccountsRequest(
  request: Request,
  origin: string,
  clientId?: string,
  clientSecret?: string,
): Promise<Response> {
  const url = new URL(request.url);
  if (
    request.method === 'POST' &&
    url.pathname.endsWith('/oauth/token') &&
    clientId !== undefined &&
    clientId.length > 0 &&
    clientSecret !== undefined &&
    clientSecret.length > 0
  ) {
    const params = new URLSearchParams(await request.text());
    params.set('client_id', clientId);
    params.set('client_secret', clientSecret);
    const headers = new Headers();
    const authorization = request.headers.get('authorization');
    if (authorization) {
      headers.set('Authorization', authorization);
    }
    headers.set('Content-Type', 'application/x-www-form-urlencoded');
    const upstream = await fetch(`${origin}/oauth/token`, {
      method: 'POST',
      headers,
      body: params,
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: contentTypeHeaders(upstream),
    });
  }

  return proxyRequest(request, origin, '/api/accounts');
}

function contentTypeHeaders(upstream: Response): Headers {
  const headers = new Headers();
  const contentType = upstream.headers.get('content-type');
  if (contentType) {
    headers.set('Content-Type', contentType);
  }
  return headers;
}
