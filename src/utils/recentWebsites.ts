const RECENT_WEBSITES_KEY = 'fwsc_recent_websites';
const USER_AUDIT_IDS_KEY = 'fwsc_user_audit_ids';
const MAX_RECENT_WEBSITES = 5;

/**
 * Validates that a stored website URL is a syntactically valid public domain
 * and not a synthetic test domain.
 */
function isValidRecentUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.length < 4 || /\s/.test(trimmed)) return false;
  const lower = trimmed.toLowerCase();
  if (
    lower.includes('nonexistent') ||
    lower.includes('127.0.0.1') ||
    lower.includes('localhost') ||
    lower.includes('169.254') ||
    lower.includes('.invalid') ||
    lower.includes('.local') ||
    lower.includes('.internal') ||
    lower.includes('definitely-does-not-exist') ||
    lower.includes('test-domain') ||
    lower.includes('example-fake')
  ) {
    return false;
  }
  try {
    const parsed = new URL(lower.startsWith('http') ? lower : `https://${lower}`);
    if (!parsed.hostname || !parsed.hostname.includes('.')) return false;
    const parts = parsed.hostname.split('.');
    const tld = parts[parts.length - 1];
    return tld.length >= 2;
  } catch {
    return false;
  }
}

/**
 * Retrieves the user's previously audited website URLs from local storage.
 * Strictly scoped per browser/user and filters out invalid or failed test domains.
 */
export function getRecentWebsites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_WEBSITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const valid = parsed
        .filter((item): item is string => typeof item === 'string' && isValidRecentUrl(item))
        .slice(0, MAX_RECENT_WEBSITES);

      // If invalid entries were filtered out, re-persist the sanitized list
      if (valid.length !== parsed.length) {
        localStorage.setItem(RECENT_WEBSITES_KEY, JSON.stringify(valid));
      }
      return valid;
    }
  } catch (err) {
    console.error('Error reading recent websites from localStorage:', err);
  }
  return [];
}

/**
 * Saves a new website URL into recent audit history.
 * - Only adds URLs that are valid public domains.
 * - Enforces uniqueness (removes duplicate if present, moves it to index 0).
 * - Limits list to maximum 5 items.
 */
export function addRecentWebsite(url: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const cleanUrl = url.trim();
    if (!cleanUrl || !isValidRecentUrl(cleanUrl)) return getRecentWebsites();

    const current = getRecentWebsites();
    // Compare without trailing slashes and case-insensitive
    const normalizedTarget = cleanUrl.toLowerCase().replace(/\/+$/, '');
    const filtered = current.filter(
      (item) => item.toLowerCase().replace(/\/+$/, '') !== normalizedTarget
    );

    const updated = [cleanUrl, ...filtered].slice(0, MAX_RECENT_WEBSITES);
    localStorage.setItem(RECENT_WEBSITES_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Error saving recent website to localStorage:', err);
    return getRecentWebsites();
  }
}

/**
 * Removes a website URL from recent audit history.
 */
export function removeRecentWebsite(url: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const cleanUrl = url.trim().toLowerCase().replace(/\/+$/, '');
    const current = getRecentWebsites();
    const updated = current.filter(
      (item) => item.toLowerCase().replace(/\/+$/, '') !== cleanUrl
    );
    localStorage.setItem(RECENT_WEBSITES_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Error removing recent website:', err);
    return getRecentWebsites();
  }
}

/**
 * Clears all recent websites from localStorage.
 */
export function clearRecentWebsites(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(RECENT_WEBSITES_KEY);
  } catch (err) {
    console.error('Error clearing recent websites:', err);
  }
}

/**
 * Retrieves audit IDs specifically initiated by this user in this browser.
 */
export function getUserAuditIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(USER_AUDIT_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((id): id is string => typeof id === 'string');
    }
  } catch (err) {
    console.error('Error reading user audit IDs:', err);
  }
  return [];
}

/**
 * Records an audit ID initiated by the current user.
 */
export function addUserAuditId(auditId: string): void {
  if (typeof window === 'undefined' || !auditId) return;
  try {
    const current = getUserAuditIds();
    if (!current.includes(auditId)) {
      localStorage.setItem(USER_AUDIT_IDS_KEY, JSON.stringify([auditId, ...current]));
    }
  } catch (err) {
    console.error('Error saving user audit ID:', err);
  }
}

/**
 * Removes an audit ID from this user's browser history.
 */
export function removeUserAuditId(auditId: string): void {
  if (typeof window === 'undefined' || !auditId) return;
  try {
    const current = getUserAuditIds();
    localStorage.setItem(
      USER_AUDIT_IDS_KEY,
      JSON.stringify(current.filter((id) => id !== auditId))
    );
  } catch (err) {
    console.error('Error removing user audit ID:', err);
  }
}
