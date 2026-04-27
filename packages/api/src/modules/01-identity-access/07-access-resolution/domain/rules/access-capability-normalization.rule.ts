// packages/api/src/modules/01-identity-and-access/07-access-resolution/domain/rules/access-capability-normalization.rule.ts

export function normalizeCapabilityKey(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeResourceKey(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeActionKey(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function buildCapabilityKeyFromResourceAction(input: {
  resourceKey: string | null;
  actionKey: string | null;
}): string | null {
  if (!input.resourceKey || !input.actionKey) {
    return null;
  }

  return `${input.resourceKey}.${input.actionKey}`;
}