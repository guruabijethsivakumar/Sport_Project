/**
 * Safe redirect validator to prevent open redirects.
 * Strictly allows only internal, same-origin relative paths.
 * Blocks:
 * - External schemes (http:, https:, javascript:, data:, etc.)
 * - Protocol-relative URLs (//evil.com)
 * - Backslashes (/\evil.com, \evil.com)
 * - Encoded slashes (%2f, %5c)
 * - Control characters and whitespace
 * - Redirects back to auth loop pages (/login, /register)
 */
export function getSafeRedirectPath(candidate: unknown, fallback = '/'): string {
  if (typeof candidate !== 'string' || !candidate.trim()) {
    return fallback;
  }

  const trimmed = candidate.trim();

  // Explicitly reject backslashes, encoded traversal/slashes, or ASCII control characters
  if (
    trimmed.includes('\\') ||
    /%2f|%5c/i.test(trimmed) ||
    // eslint-disable-next-line no-control-regex
    /[\u0000-\u001f\u007f-\u009f]/.test(trimmed)
  ) {
    return fallback;
  }

  // Must start with exactly one forward slash, not '//'
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return fallback;
  }

  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const parsed = new URL(trimmed, origin);

    // Origin must match exactly
    if (parsed.origin !== origin) {
      return fallback;
    }

    // Never redirect back to auth gates
    if (
      parsed.pathname === '/login' ||
      parsed.pathname === '/register' ||
      parsed.pathname === '/forgot-password' ||
      parsed.pathname === '/logout'
    ) {
      return fallback;
    }

    // Return the safe path + query + hash
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
