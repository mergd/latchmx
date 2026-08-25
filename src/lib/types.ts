export const DOOR_OPEN_MS = 8000;

export type DoorKind = 'access_point' | 'device';

export type Door = {
  id: string;
  remoteId: number;
  kind: DoorKind;
  name: string;
  buildingId: number;
  buildingName: string;
  tenantId: number;
  heldOpen: boolean;
};

export type UnlockStatus = 'idle' | 'unlocking' | 'open' | 'error';

export type SessionMode = 'loading' | 'signed_out' | 'signed_in' | 'guest';

export const KEY_TTLS = ['1h', 'tonight', '24h'] as const;

export type KeyTtl = (typeof KEY_TTLS)[number];

export type IssuedKey = {
  id: string;
  expiresAt: number;
  createdAt: number;
  revoked: boolean;
  doorCount: number;
};

export type CreatedKey = IssuedKey & {
  url: string;
};

export type GuestSession = {
  doors: Door[];
  buildingName: string;
  expiresAt: number;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

export type Account = {
  name: string | null;
  email: string | null;
};

export type BmxEnv = 'sandbox' | 'production';
