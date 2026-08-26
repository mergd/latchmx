import * as Application from 'expo-application';
import Constants from 'expo-constants';

type Extra = {
  buildHash?: string;
  buildDirty?: boolean;
  feedbackEmail?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;
const rawHash = extra.buildHash?.trim() ?? '';

export const build = {
  version: Constants.expoConfig?.version ?? '1.0.0',
  native: Application.nativeBuildVersion,
  hash: rawHash,
  shortHash:
    rawHash.length >= 7 ? rawHash.slice(0, 7) : rawHash.length > 0 ? rawHash : 'dev',
  dirty: extra.buildDirty === true,
  feedbackEmail: extra.feedbackEmail?.trim() || 'hello@fldr.zip',
};

export function buildStamp(): string {
  return `${build.shortHash}${build.dirty ? '*' : ''}`;
}

export function buildLabel(): string {
  const stamp = buildStamp();
  if (build.native !== null && build.native.length > 0) {
    return `${build.version} (${build.native}) · ${stamp}`;
  }
  return `${build.version} · ${stamp}`;
}
