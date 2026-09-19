import type { DoorHoursWindow } from './door-hours';

export type { DoorHoursWindow } from './door-hours';

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
  disabled: boolean;
  /** Availability reported by ButterflyMX before local schedule rules. */
  sourceDisabled?: boolean;
  lockout: boolean;
  /** Schedule lookup is still pending; lockout doors fail closed meanwhile. */
  schedulePending?: boolean;
  hours: DoorHoursWindow[];
  timeZone: string;
  /** Exact BLE reader names or serials authorized for this access point. */
  nearbyIdentifiers?: string[];
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
  label: string;
  note: string | null;
  inviterName: string | null;
  contact: string | null;
  url: string | null;
};

export type CreatedKey = IssuedKey & {
  url: string;
};

export type GuestInvite = {
  label: string;
  note: string | null;
  inviterName: string | null;
  contact: string | null;
};

export type GuestSession = {
  doors: Door[];
  buildingName: string;
  expiresAt: number;
  invite: GuestInvite;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

export type AccountProfile = {
  name: string | null;
  email: string | null;
};

export type AccountKind = 'resident' | 'guest';

export type Account = AccountProfile & {
  id: string;
  kind: AccountKind;
  buildingName: string | null;
  createdAt: number;
};

export type BmxEnv = 'sandbox' | 'production';
