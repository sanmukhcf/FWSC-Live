export class UrlQueue {
  private queue: string[] = [];
  private visited: Set<string> = new Set();
  private discovered: Set<string> = new Set();
  private baseHostname: string;
  private maxPages: number;

  private static IGNORED_EXTENSIONS = new Set([
    '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico', '.bmp', '.tiff',
    '.pdf', '.zip', '.tar', '.gz', '.rar', '.7z',
    '.mp3', '.wav', '.ogg', '.mp4', '.avi', '.mov', '.webm',
    '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.css', '.js', '.json', '.xml', '.rss', '.woff', '.woff2', '.ttf', '.eot',
  ]);

  private static IGNORED_KEYWORDS = [
    '/cart', '/checkout', '/login', '/logout', '/signin', '/signout',
    '/wp-login', '/wp-admin', '/admin', '/account/orders', '/my-account',
    'add-to-cart', 'action=logout', 'action=login',
  ];

  constructor(initialUrl: string, maxPages: number = 50) {
    const parsed = new URL(initialUrl);
    this.baseHostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    this.maxPages = Math.min(Math.max(maxPages, 5), 500);
    this.add(initialUrl);
  }

  public get queueLength(): number {
    return this.queue.length;
  }

  public get visitedCount(): number {
    return this.visited.size;
  }

  public get discoveredCount(): number {
    return this.discovered.size;
  }

  public hasNext(): boolean {
    return this.queue.length > 0 && this.visited.size < this.maxPages;
  }

  public next(): string | null {
    while (this.queue.length > 0) {
      const url = this.queue.shift()!;
      if (!this.visited.has(url)) {
        this.visited.add(url);
        return url;
      }
    }
    return null;
  }

  public isVisited(url: string): boolean {
    const normalized = this.normalizeUrl(url);
    return normalized ? this.visited.has(normalized) : true;
  }

  public add(rawUrl: string): boolean {
    if (this.discovered.size >= this.maxPages * 5) {
      return false; // prevent memory explosion on huge sites
    }

    const normalized = this.normalizeUrl(rawUrl);
    if (!normalized) return false;

    if (!this.discovered.has(normalized)) {
      this.discovered.add(normalized);
      if (!this.visited.has(normalized)) {
        this.queue.push(normalized);
        return true;
      }
    }
    return false;
  }

  public addBatch(urls: string[]): number {
    let added = 0;
    for (const u of urls) {
      if (this.add(u)) {
        added++;
      }
    }
    return added;
  }

  public normalizeUrl(rawUrl: string, sourceUrl?: string): string | null {
    if (!rawUrl || typeof rawUrl !== 'string') return null;

    const trimmed = rawUrl.trim();
    if (!trimmed || trimmed.startsWith('#')) return null;

    // Check non-http schemes
    const lower = trimmed.toLowerCase();
    if (
      lower.startsWith('javascript:') ||
      lower.startsWith('mailto:') ||
      lower.startsWith('tel:') ||
      lower.startsWith('data:') ||
      lower.startsWith('sms:') ||
      lower.startsWith('callto:')
    ) {
      return null;
    }

    try {
      const parsed = sourceUrl ? new URL(trimmed, sourceUrl) : new URL(trimmed);

      // Must be http or https
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return null;
      }

      // Must belong to same domain or subdomain
      const urlHostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
      if (urlHostname !== this.baseHostname && !urlHostname.endsWith('.' + this.baseHostname)) {
        return null;
      }

      // Check ignored extensions
      const pathname = parsed.pathname.toLowerCase();
      for (const ext of UrlQueue.IGNORED_EXTENSIONS) {
        if (pathname.endsWith(ext)) {
          return null;
        }
      }

      // Check ignored keyword patterns (cart, checkout, logout, etc.)
      const fullPath = (parsed.pathname + parsed.search).toLowerCase();
      if (UrlQueue.IGNORED_KEYWORDS.some(kw => fullPath.includes(kw))) {
        return null;
      }

      // Normalize URL: remove hash, strip trailing slash if not root
      parsed.hash = '';

      // Normalize trailing slash
      if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
        parsed.pathname = parsed.pathname.slice(0, -1);
      }

      return parsed.toString();
    } catch {
      return null;
    }
  }

  public isInternalUrl(targetUrl: string): boolean {
    try {
      const parsed = new URL(targetUrl);
      const urlHostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
      return urlHostname === this.baseHostname || urlHostname.endsWith('.' + this.baseHostname);
    } catch {
      return false;
    }
  }
}
