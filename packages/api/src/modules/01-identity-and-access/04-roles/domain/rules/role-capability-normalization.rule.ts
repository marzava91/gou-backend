export function normalizeCapabilityKeys(
  capabilityKeys: string[],
): string[] {
  return [...new Set(
    capabilityKeys
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => value.toLowerCase())
  )].sort();
}