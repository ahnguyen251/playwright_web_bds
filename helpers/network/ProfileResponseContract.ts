import type { AuthResponseSnapshot } from './AuthRequestObserver';

export interface ProfileAccountSnapshot {
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly hasAvatar: boolean;
  readonly accountStatus: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const invalidProfileResponse = (): Error =>
  new Error('Profile account response does not match the required contract.');

export const requireProfileAccountSnapshot = (
  response: AuthResponseSnapshot,
): ProfileAccountSnapshot => {
  if (response.status < 200 || response.status >= 300 || !isRecord(response.body)) {
    throw invalidProfileResponse();
  }

  const data = response.body.data;
  if (!isRecord(data)) throw invalidProfileResponse();

  const { full_name: fullName, email, phone, avatar_url: avatarUrl, status } = data;
  if (
    typeof fullName !== 'string' ||
    typeof email !== 'string' ||
    (typeof phone !== 'string' && phone !== null) ||
    (typeof avatarUrl !== 'string' && avatarUrl !== null) ||
    typeof status !== 'string'
  ) {
    throw invalidProfileResponse();
  }

  return Object.freeze({
    fullName,
    email,
    phone: phone ?? '',
    hasAvatar: avatarUrl !== null && avatarUrl.trim() !== '',
    accountStatus: status,
  });
};
