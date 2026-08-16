import { bmxAccountsBaseUrl } from '@/lib/config';
import { proxyRequest } from '@/lib/server-proxy';

export async function GET(request: Request) {
  return proxyRequest(request, bmxAccountsBaseUrl(), '/api/accounts');
}

export async function POST(request: Request) {
  return proxyRequest(request, bmxAccountsBaseUrl(), '/api/accounts');
}
