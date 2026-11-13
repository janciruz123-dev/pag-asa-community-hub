/** Minimum length the system owner's first-admin setup code must have before setup is allowed. */
export const MIN_SETUP_CODE_LENGTH = 12;

async function digest(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

/**
 * Compare an entered setup code with the configured one without leaking timing.
 * Fails closed when no code (or a too-short code) is configured.
 */
export async function setupCodeMatches(configured: string | undefined, entered: string): Promise<boolean> {
  if (!configured || configured.trim().length < MIN_SETUP_CODE_LENGTH) return false;
  if (!entered) return false;
  const [a, b] = await Promise.all([digest(configured.trim()), digest(entered.trim())]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}
