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
  const responseHeaders = new Headers();
  const upstreamType = upstream.headers.get('content-type');
  if (upstreamType) {
    responseHeaders.set('Content-Type', upstreamType);
  }
  return new Response(body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
