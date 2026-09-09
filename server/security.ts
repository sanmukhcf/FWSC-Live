import dns from 'dns';
import net from 'net';

export interface UrlValidationResult {
  isValid: boolean;
  normalizedUrl: string;
  error?: string;
}

export interface DnsValidationResult {
  isValid: boolean;
  ip?: string;
  addresses?: string[];
  errorType?: string;
  reason?: string;
  message?: string;
}

const FORBIDDEN_HOSTNAMES = [
  'localhost',
  'metadata.google.internal',
  '169.254.169.254',
  'instance-data',
  'kubernetes.default',
];

export function isPrivateOrReservedIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some(n => isNaN(n) || n < 0 || n > 255)) return true;
    if (parts[0] === 0) return true; // Current network
    if (parts[0] === 10) return true; // Private network 10.0.0.0/8
    if (parts[0] === 127) return true; // Loopback 127.0.0.0/8
    if (parts[0] === 169 && parts[1] === 254) return true; // Link-local 169.254.0.0/16
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // Private network 172.16.0.0/12
    if (parts[0] === 192 && parts[1] === 168) return true; // Private network 192.168.0.0/16
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true; // Carrier-grade NAT
    if (parts[0] >= 224) return true; // Multicast & reserved (224.0.0.0/4 and 240.0.0.0/4)
    return false;
  }

  if (net.isIPv6(ip)) {
    const clean = ip.toLowerCase();
    if (clean === '::1' || clean === '::') return true;
    if (clean.startsWith('fe80:') || clean.startsWith('fc00:') || clean.startsWith('fd00:')) return true;
    if (clean.startsWith('::ffff:')) {
      const v4 = clean.replace('::ffff:', '');
      return isPrivateOrReservedIp(v4);
    }
    return false;
  }

  return false;
}

export function sanitizeAndNormalizeUrl(rawInput: string): UrlValidationResult {
  if (!rawInput || typeof rawInput !== 'string' || !rawInput.trim()) {
    return { isValid: false, normalizedUrl: '', error: 'Please enter a website URL.' };
  }

  let trimmed = rawInput.trim();

  // Reject URLs containing spaces
  if (/\s/.test(trimmed)) {
    return { isValid: false, normalizedUrl: '', error: 'URL must not contain spaces.' };
  }

  // Check scheme
  const schemeMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase();
    if (scheme !== 'http' && scheme !== 'https') {
      return { isValid: false, normalizedUrl: '', error: `Unsupported protocol (${scheme}:). Only HTTP and HTTPS are allowed.` };
    }
  } else {
    trimmed = 'https://' + trimmed;
  }

  try {
    const parsed = new URL(trimmed);

    // Protocol check
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { isValid: false, normalizedUrl: '', error: 'Only HTTP and HTTPS URLs are allowed.' };
    }

    const hostname = parsed.hostname.toLowerCase();
    if (!hostname) {
      return { isValid: false, normalizedUrl: '', error: 'URL must include a valid domain name.' };
    }

    // Check forbidden hostnames
    if (FORBIDDEN_HOSTNAMES.some(forbidden => hostname === forbidden || hostname.endsWith('.' + forbidden))) {
      return { isValid: false, normalizedUrl: '', error: 'Access to internal or restricted network addresses is not permitted.' };
    }

    if (hostname.endsWith('.local') || hostname.endsWith('.internal') || hostname.endsWith('.localhost') || hostname.endsWith('.invalid')) {
      return { isValid: false, normalizedUrl: '', error: 'Access to private or local domains is not permitted.' };
    }

    // Check direct IP address
    if (isPrivateOrReservedIp(hostname)) {
      return { isValid: false, normalizedUrl: '', error: 'Access to private, loopback, or internal IP addresses is forbidden.' };
    }

    // Check domain structure if not a literal IP
    if (!net.isIP(hostname)) {
      if (!hostname.includes('.')) {
        return { isValid: false, normalizedUrl: '', error: 'Domain name must include a valid top-level domain (e.g. .com, .org).' };
      }
      const parts = hostname.split('.');
      const tld = parts[parts.length - 1];
      if (tld.length < 2 || !/^[a-z0-9-]+$/i.test(tld)) {
        return { isValid: false, normalizedUrl: '', error: 'Domain name has an invalid top-level domain extension.' };
      }
    }

    // Remove hash/fragment, keep pathname and search query
    parsed.hash = '';

    return {
      isValid: true,
      normalizedUrl: parsed.toString(),
    };
  } catch {
    return { isValid: false, normalizedUrl: '', error: 'Invalid URL format. Please include a valid website domain.' };
  }
}

/**
 * Resolves DNS for the given hostname and verifies that resolved addresses are public and safe.
 */
export async function resolveAndValidateDns(hostname: string, timeoutMs = 6000): Promise<DnsValidationResult> {
  // If hostname is already an IP address
  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      return {
        isValid: false,
        errorType: 'Restricted Network Address',
        reason: 'SSRF_RESTRICTED_IP',
        message: 'The IP address is a private or internal network address.',
      };
    }
    return { isValid: true, ip: hostname, addresses: [hostname] };
  }

  try {
    const lookupPromise = dns.promises.lookup(hostname, { all: true });
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        const err = new Error('DNS resolution timed out');
        (err as any).code = 'ETIMEDOUT';
        reject(err);
      }, timeoutMs);
    });

    const addresses = await Promise.race([lookupPromise, timeoutPromise]);
    if (!addresses || addresses.length === 0) {
      return {
        isValid: false,
        errorType: 'DNS Resolution Failed',
        reason: 'ENOTFOUND',
        message: 'The domain could not be resolved. Please check the website address and try again.',
      };
    }

    for (const addr of addresses) {
      if (isPrivateOrReservedIp(addr.address)) {
        return {
          isValid: false,
          errorType: 'Restricted Network Address',
          reason: 'SSRF_RESTRICTED_IP',
          message: `The domain resolves to a private or restricted network address (${addr.address}).`,
        };
      }
    }

    return {
      isValid: true,
      ip: addresses[0].address,
      addresses: addresses.map(a => a.address),
    };
  } catch (err: any) {
    const code = err.code || 'DNS_ERROR';
    if (code === 'ENOTFOUND' || code === 'NXDOMAIN' || code === 'EAI_NONAME' || code === 'EAI_AGAIN') {
      return {
        isValid: false,
        errorType: 'DNS Resolution Failed',
        reason: code,
        message: 'The domain could not be resolved. Please check the website address and try again.',
      };
    }
    if (code === 'ETIMEDOUT') {
      return {
        isValid: false,
        errorType: 'DNS Resolution Failed',
        reason: 'ETIMEDOUT',
        message: 'DNS query timed out while trying to resolve the domain.',
      };
    }
    return {
      isValid: false,
      errorType: 'DNS Resolution Failed',
      reason: code,
      message: `Could not resolve domain: ${err.message || code}`,
    };
  }
}

/**
 * Backward compatibility helper
 */
export async function verifyRemoteAddress(hostname: string): Promise<boolean> {
  const result = await resolveAndValidateDns(hostname);
  return result.isValid;
}
