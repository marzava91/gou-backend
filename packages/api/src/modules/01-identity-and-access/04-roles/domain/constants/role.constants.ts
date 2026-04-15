export const ROLE_CAPABILITY_KEY_MAX_LENGTH = 160;
export const ROLE_KEY_MAX_LENGTH = 120;
export const ROLE_NAME_MAX_LENGTH = 180;
export const ROLE_DESCRIPTION_MAX_LENGTH = 500;
export const ROLE_REASON_MAX_LENGTH = 500;

export const ROLE_LIST_SORT_FIELDS = ['createdAt', 'name', 'key'] as const;
export const ROLE_SORT_DIRECTIONS = ['asc', 'desc'] as const;

export const ROLE_AUDIT_ACTIONS = {
  ROLE_CREATED: 'role_created',
  ROLE_UPDATED: 'role_updated',
  ROLE_RETIRED: 'role_retired',
  ROLE_ASSIGNED: 'role_assigned',
  ROLE_ASSIGNMENT_REVOKED: 'role_assignment_revoked',
} as const;