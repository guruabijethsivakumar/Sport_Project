export const UserStatuses = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  ARCHIVED: 'archived',
} as const;

export type UserStatus = (typeof UserStatuses)[keyof typeof UserStatuses];

export const ALL_USER_STATUSES: readonly UserStatus[] = [
  UserStatuses.ACTIVE,
  UserStatuses.SUSPENDED,
  UserStatuses.ARCHIVED,
] as const;

export const DEFAULT_USER_STATUS: UserStatus = UserStatuses.ACTIVE;
