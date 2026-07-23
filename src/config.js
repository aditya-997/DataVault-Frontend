/**
 * Central API configuration for DataVault.
 *
 * When running inside a Capacitor mobile wrapper, `window.location.origin`
 * resolves to `capacitor://localhost` (iOS) or `http://localhost` (Android),
 * which cannot reach the Spring Boot backend on the network.
 *
 * This utility checks localStorage for a user-configured server URL and
 * falls back to `window.location.origin` for regular web deployments.
 */

const STORAGE_KEY = 'datavault_api_url';

/**
 * Returns the base URL for all API calls.
 * Priority: localStorage override → window.location.origin
 */
export function getApiBaseUrl() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored.trim()) {
      // Strip trailing slash for consistency
      return stored.trim().replace(/\/+$/, '');
    }
  } catch {
    // localStorage may be unavailable in some contexts
  }
  return window.location.origin;
}

/**
 * Persist a custom API server URL.
 * @param {string} url – e.g. "http://192.168.1.15:8081"
 */
export function setApiBaseUrl(url) {
  try {
    if (url && url.trim()) {
      localStorage.setItem(STORAGE_KEY, url.trim().replace(/\/+$/, ''));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // silent
  }
}

/**
 * Returns the currently stored custom URL, or empty string if none.
 */
export function getStoredApiUrl() {
  try {
    return localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
}
