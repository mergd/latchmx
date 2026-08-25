export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function json(data: unknown, status = 200, headers?: Headers): Response {
  const next = headers ?? new Headers();
  next.set('Content-Type', 'application/json');
  return new Response(JSON.stringify(data), { status, headers: next });
}

export function corsHeaders(request: Request): Headers {
  const headers = new Headers();
  const origin = request.headers.get('Origin');
  if (origin !== null && allowedOrigin(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Vary', 'Origin');
    headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  }
  return headers;
}

export function bearer(request: Request): string {
  const header = request.headers.get('Authorization');
  if (header === null || !header.startsWith('Bearer ')) {
    throw new HttpError(401, 'Sign in to continue.');
  }
  const token = header.slice(7).trim();
  if (token.length === 0) {
    throw new HttpError(401, 'Sign in to continue.');
  }
  return token;
}

function allowedOrigin(origin: string): boolean {
  if (origin === 'https://bmx.fldr.zip') {
    return true;
  }
  try {
    const host = new URL(origin).hostname;
    return host === 'localhost' || host === '127.0.0.1';
  } catch {
    return false;
  }
}
