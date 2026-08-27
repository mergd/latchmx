import { storageGet, storageRemove, storageSet } from '@/lib/storage';
import type { Account, AccountProfile, GuestInvite } from '@/lib/types';

export const ACCOUNT_KEY = 'latch.account';

export async function loadAccount(): Promise<Account | null> {
  return parseAccount(await storageGet(ACCOUNT_KEY));
}

export async function persistAccount(next: Account | null): Promise<void> {
  if (next === null) {
    await storageRemove(ACCOUNT_KEY);
    return;
  }
  await storageSet(ACCOUNT_KEY, JSON.stringify(next));
}

export function residentFromProfile(
  existing: Account | null,
  profile: AccountProfile | null,
  buildingName: string,
): Account {
  const keep = existing?.kind === 'resident' ? existing : null;
  return {
    id: keep?.id ?? newAccountId(),
    kind: 'resident',
    name: profile?.name ?? keep?.name ?? null,
    email: profile?.email ?? keep?.email ?? null,
    buildingName: buildingName.length > 0 ? buildingName : (keep?.buildingName ?? null),
    createdAt: keep?.createdAt ?? Date.now(),
  };
}

export function guestFromInvite(
  existing: Account | null,
  invite: GuestInvite | null,
  buildingName: string,
): Account {
  const keep = existing?.kind === 'guest' ? existing : null;
  const label = invite?.label?.trim() ?? '';
  return {
    id: keep?.id ?? newAccountId(),
    kind: 'guest',
    name: label.length > 0 ? label : (keep?.name ?? 'Guest'),
    email: null,
    buildingName: buildingName.length > 0 ? buildingName : (keep?.buildingName ?? null),
    createdAt: keep?.createdAt ?? Date.now(),
  };
}

export function parseAccount(raw: string | null): Account | null {
  if (raw === null) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<Account>;
    if (typeof parsed.id !== 'string' || parsed.id.length === 0) {
      return null;
    }
    if (parsed.kind !== 'resident' && parsed.kind !== 'guest') {
      return null;
    }
    if (typeof parsed.createdAt !== 'number') {
      return null;
    }
    return {
      id: parsed.id,
      kind: parsed.kind,
      name: typeof parsed.name === 'string' ? parsed.name : null,
      email: typeof parsed.email === 'string' ? parsed.email : null,
      buildingName:
        typeof parsed.buildingName === 'string' ? parsed.buildingName : null,
      createdAt: parsed.createdAt,
    };
  } catch {
    return null;
  }
}

function newAccountId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `acc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
