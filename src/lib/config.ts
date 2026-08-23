import Constants from 'expo-constants';

import type { BmxEnv } from '@/lib/types';

type Extra = {
  bmxEnv?: string;
  bmxClientId?: string;
  bmxRedirectUri?: string;
  bmxProxyOrigin?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

function parseEnv(value: string | undefined): BmxEnv {
  if (value === 'production') {
    return 'production';
  }
  return 'sandbox';
}

const DEFAULT_REDIRECT = 'urn:ietf:wg:oauth:2.0:oob';
const DEFAULT_PROXY = 'https://bmx.fldr.zip';

export const bmxConfig = {
  env: parseEnv(extra.bmxEnv),
  clientId: extra.bmxClientId ?? '',
  redirectUri:
    extra.bmxRedirectUri && extra.bmxRedirectUri.length > 0
      ? extra.bmxRedirectUri
      : DEFAULT_REDIRECT,
  proxyOrigin:
    extra.bmxProxyOrigin && extra.bmxProxyOrigin.length > 0
      ? extra.bmxProxyOrigin.replace(/\/+$/, '')
      : DEFAULT_PROXY,
};

export function hasBmxCredentials(): boolean {
  return bmxConfig.clientId.length > 0;
}

export function bmxApiBaseUrl(): string {
  switch (bmxConfig.env) {
    case 'production':
      return 'https://api.butterflymx.com';
    case 'sandbox':
      return 'https://api.na.sandbox.butterflymx.com';
    default: {
      const _never: never = bmxConfig.env;
      return _never;
    }
  }
}

export function bmxAccountsBaseUrl(): string {
  switch (bmxConfig.env) {
    case 'production':
      return 'https://accounts.butterflymx.com';
    case 'sandbox':
      return 'https://accounts.na.sandbox.butterflymx.com';
    default: {
      const _never: never = bmxConfig.env;
      return _never;
    }
  }
}
