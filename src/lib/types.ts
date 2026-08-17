export type DoorKind = 'access_point' | 'device';

export type Door = {
  id: string;
  remoteId: number;
  kind: DoorKind;
  name: string;
  buildingId: number;
  buildingName: string;
  tenantId: number;
};

export type UnlockStatus = 'idle' | 'unlocking' | 'open' | 'error';

export type SessionMode = 'loading' | 'signed_out' | 'signed_in';

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

export type BmxEnv = 'sandbox' | 'production';
