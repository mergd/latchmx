export type Env = {
  ASSETS: Fetcher;
  KEYS: KVNamespace;
  BMX_API_ORIGIN: string;
  BMX_ACCOUNTS_ORIGIN: string;
  BMX_CLIENT_ID?: string;
  BMX_CLIENT_SECRET?: string;
  KEYS_SECRET?: string;
};

export function wrapSecret(env: Env): string {
  const secret = env.KEYS_SECRET ?? env.BMX_CLIENT_SECRET;
  if (secret === undefined || secret.length === 0) {
    throw new Error('KEYS_SECRET is not configured.');
  }
  return secret;
}
