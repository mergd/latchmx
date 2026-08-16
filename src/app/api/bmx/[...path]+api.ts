import { bmxApiBaseUrl } from '@/lib/config';
import { proxyRequest } from '@/lib/server-proxy';

export async function GET(request: Request) {
  return proxyRequest(request, bmxApiBaseUrl(), '/api/bmx');
}

export async function POST(request: Request) {
  return proxyRequest(request, bmxApiBaseUrl(), '/api/bmx');
}

export async function PUT(request: Request) {
  return proxyRequest(request, bmxApiBaseUrl(), '/api/bmx');
}

export async function DELETE(request: Request) {
  return proxyRequest(request, bmxApiBaseUrl(), '/api/bmx');
}
