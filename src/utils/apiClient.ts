import type { AuditErrorDetails } from '../types';

export interface ApiResponse<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
  errorDetails?: AuditErrorDetails;
  rawText?: string;
}

/**
 * Base API URL resolution:
 * In development or standard deployment, this defaults to empty string (same-origin relative URLs).
 * If VITE_API_URL or VITE_API_BASE_URL is defined in environment variables, it prepends that base URL.
 */
export function getApiUrl(path: string): string {
  const metaEnv = (import.meta as any)?.env;
  const envBase = (metaEnv?.VITE_API_URL || metaEnv?.VITE_API_BASE_URL || '').trim();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  if (!envBase) {
    return cleanPath;
  }

  const normalizedBase = envBase.replace(/\/+$/, '');
  return `${normalizedBase}${cleanPath}`;
}

/**
 * Safely executes an HTTP request and parses the response without crashing on HTML or plain text.
 * NEVER blindly calls response.json().
 * Inspects Content-Type, handles empty bodies, HTML error pages, and plain text gracefully.
 */
export async function safeFetchJson<T = any>(
  path: string,
  init?: RequestInit
): Promise<ApiResponse<T>> {
  const fullUrl = getApiUrl(path);

  try {
    const res = await fetch(fullUrl, {
      ...init,
      headers: {
        Accept: 'application/json, text/plain, */*',
        ...(init?.headers || {}),
      },
    });

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    const text = await res.text();
    const trimmedText = text.trim();

    // 1. Empty body handling
    if (!trimmedText) {
      if (res.ok) {
        return {
          ok: true,
          status: res.status,
          data: undefined,
        };
      }
      return {
        ok: false,
        status: res.status,
        error: `Server returned HTTP ${res.status} with empty response`,
        errorDetails: {
          type: 'crawl_error',
          errorType: 'Server Error',
          reason: `HTTP_${res.status}`,
          message: `The server returned HTTP status ${res.status} (${res.statusText || 'Error'}) without response data.`,
          url: fullUrl,
        },
      };
    }

    // 2. Check if content is JSON or looks like JSON
    const isJsonHeader = contentType.includes('application/json');
    const looksLikeJson =
      (trimmedText.startsWith('{') && trimmedText.endsWith('}')) ||
      (trimmedText.startsWith('[') && trimmedText.endsWith(']'));

    if (isJsonHeader || looksLikeJson) {
      try {
        const parsed = JSON.parse(trimmedText);

        if (!res.ok) {
          const errorMsg =
            parsed.error ||
            parsed.message ||
            `Request failed with HTTP status ${res.status} (${res.statusText || 'Error'})`;

          const details: AuditErrorDetails = parsed.errorDetails || {
            type: 'crawl_error',
            errorType: parsed.errorType || `HTTP Error ${res.status}`,
            reason: parsed.reason || `HTTP_${res.status}`,
            message: errorMsg,
            url: parsed.url || fullUrl,
            statusCode: res.status,
          };

          return {
            ok: false,
            status: res.status,
            error: errorMsg,
            errorDetails: details,
            data: parsed,
            rawText: trimmedText,
          };
        }

        return {
          ok: true,
          status: res.status,
          data: parsed,
          rawText: trimmedText,
        };
      } catch {
        // If JSON parsing fails despite looking like JSON, fall through to text/HTML handling below
      }
    }

    // 3. Response is NOT JSON (e.g. HTML from Vercel / reverse proxy or plain text)
    const isHtml =
      contentType.includes('text/html') ||
      trimmedText.toLowerCase().startsWith('<!doctype') ||
      trimmedText.toLowerCase().startsWith('<html');

    let cleanErrorMessage = '';
    let errorReason = `HTTP_${res.status}`;

    if (isHtml) {
      if (res.status === 404) {
        cleanErrorMessage =
          'The requested API endpoint was not found (HTTP 404). If deployed on Vercel or GitHub, ensure API serverless functions are configured.';
        errorReason = 'API_NOT_FOUND';
      } else if (res.status === 502 || res.status === 503 || res.status === 504) {
        cleanErrorMessage = `The application gateway or server is temporarily unavailable (HTTP ${res.status}).`;
        errorReason = 'GATEWAY_ERROR';
      } else {
        cleanErrorMessage = `Server returned an HTML response instead of JSON (HTTP ${res.status} ${res.statusText || ''}).`;
        errorReason = 'NON_JSON_RESPONSE';
      }
    } else {
      // Plain text response: strip extra whitespace and truncate to reasonable length
      const snippet = trimmedText.replace(/[\r\n\t]+/g, ' ').slice(0, 160);
      cleanErrorMessage = snippet || `Server returned HTTP ${res.status} (${res.statusText || 'Error'})`;
    }

    return {
      ok: res.ok,
      status: res.status,
      error: cleanErrorMessage,
      errorDetails: {
        type: 'crawl_error',
        errorType: isHtml ? 'Non-JSON Server Response' : `HTTP Error ${res.status}`,
        reason: errorReason,
        message: cleanErrorMessage,
        url: fullUrl,
        statusCode: res.status,
      },
      rawText: trimmedText,
    };
  } catch (networkErr: any) {
    const isAbort = networkErr?.name === 'AbortError';
    const errorMsg = isAbort
      ? 'The request timed out while contacting the audit server.'
      : 'Network connection failed. Could not communicate with the audit server.';

    return {
      ok: false,
      status: 0,
      error: errorMsg,
      errorDetails: {
        type: 'unreachable',
        errorType: isAbort ? 'Request Timeout' : 'Network Error',
        reason: isAbort ? 'TIMEOUT' : 'FETCH_FAILED',
        message: errorMsg,
        url: fullUrl,
      },
    };
  }
}
