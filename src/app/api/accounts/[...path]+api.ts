import { bmxAccountsBaseUrl } from '@/lib/config';
import { proxyAccountsRequest } from '@/lib/server-proxy';

export async function GET(request: Request) {
  return proxyAccountsRequest(
    request,
    bmxAccountsBaseUrl(),
    process.env.BMX_CLIENT_ID,
    process.env.BMX_CLIENT_SECRET,
  );
}

export async function POST(request: Request) {
  return proxyAccountsRequest(
    request,
    bmxAccountsBaseUrl(),
    process.env.BMX_CLIENT_ID,
    process.env.BMX_CLIENT_SECRET,
  );
}
