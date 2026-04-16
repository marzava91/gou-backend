export function normalizeGrantKey(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeCapabilityKey(value: string): string {
  return normalizeGrantKey(value);
}

export function normalizeResourceKey(value: string): string {
  return normalizeGrantKey(value);
}

export function normalizeActionKey(value: string): string {
  return normalizeGrantKey(value);
}