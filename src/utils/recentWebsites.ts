const RECENT_WEBSITES_KEY = 'fwsc_recent_websites';
const USER_AUDIT_IDS_KEY = 'fwsc_user_audit_ids';
const MAX_RECENT_WEBSITES = 5;

/**
 * Retrieves the user's previously audited website URLs from local storage.
 * Strictly scoped per browser/user to prevent showing websites from other users.
 */
export function getRecentWebsites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_WEBSITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .slice(0, MAX_RECENT_WEBSITES);
    }
  } catch (err) {
    console.error('Error reading recent websites from localStorage:', err);
  }
  return [];
}

/**
 * Saves a new website URL into recent audit history.
 * - Enforces uniqueness (removes duplicate if present, moves it to index 0).
 * - Limits list to maximum 5 items.
 * - Stores locally per browser.
 */
export function addRecentWebsite(url: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const cleanUrl = url.trim();
    if (!cleanUrl) return getRecentWebsites();

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
