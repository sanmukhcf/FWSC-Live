import type { CrawledPage, BrokenLink } from '../../src/types';
import { CRAWLER_USER_AGENT } from './constants';

export class LinkAnalyzer {
  static async analyzeLinks(
    pages: CrawledPage[],
    sitemapUrls: string[] = []
  ): Promise<{
    pages: CrawledPage[];
    brokenLinks: BrokenLink[];
    uniqueExternalDomainsCount: number;
    totalExternalLinksCount: number;
  }> {
    // 1. Build map of crawled URLs to their status codes
    const crawledUrlMap = new Map<string, number>();
    for (const page of pages) {
      crawledUrlMap.set(page.url.replace(/\/$/, ''), page.statusCode);
      crawledUrlMap.set(page.finalUrl.replace(/\/$/, ''), page.statusCode);
    }

    // 2. Count incoming internal links
    const incomingCounts = new Map<string, number>();
    const externalLinksSet = new Set<string>();
    const externalDomainsSet = new Set<string>();
    const brokenLinks: BrokenLink[] = [];
    const brokenLinkKeys = new Set<string>();

    for (const page of pages) {
      const pageNorm = page.url.replace(/\/$/, '');

      for (const link of page.internalLinks) {
        const linkNorm = link.href.replace(/\/$/, '');
        // Don't count self-links as incoming link from another page
        if (linkNorm !== pageNorm) {
          incomingCounts.set(linkNorm, (incomingCounts.get(linkNorm) || 0) + 1);
        }

        // Check if internal target is broken
        if (crawledUrlMap.has(linkNorm)) {
          const status = crawledUrlMap.get(linkNorm)!;
          if (status >= 400) {
            link.statusCode = status;
            link.isBroken = true;
            const key = `${page.url}->${link.href}`;
            if (!brokenLinkKeys.has(key)) {
              brokenLinkKeys.add(key);
              brokenLinks.push({
                sourcePage: page.url,
                targetUrl: link.href,
                statusCode: status,
                isExternal: false,
              });
            }
          }
        }
      }

      for (const ext of page.externalLinks) {
        externalLinksSet.add(ext.href);
        try {
          const parsed = new URL(ext.href);
          externalDomainsSet.add(parsed.hostname.toLowerCase());
        } catch {}
      }
    }

    // 3. Update incoming counts & orphan flags
    // Home page or first page is not an orphan
    const firstPageNorm = pages.length > 0 ? pages[0].url.replace(/\/$/, '') : '';

    const updatedPages = pages.map((page, idx) => {
      const pageNorm = page.url.replace(/\/$/, '');
      const incoming = incomingCounts.get(pageNorm) || 0;
      const isOrphan = idx !== 0 && incoming === 0 && pageNorm !== firstPageNorm;

      return {
        ...page,
        incomingInternalLinksCount: incoming,
        isOrphan,
      };
    });

    // 4. Sample check top 10 unique external links for broken status (with low latency timeout)
    const externalUrlsToCheck = Array.from(externalLinksSet).slice(0, 10);
    await Promise.allSettled(
      externalUrlsToCheck.map(async (extUrl) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);
          const res = await fetch(extUrl, {
            method: 'HEAD',
            signal: controller.signal,
            headers: { 'User-Agent': CRAWLER_USER_AGENT },
          });
          clearTimeout(timeoutId);

          if (res.status >= 400 && res.status !== 403 && res.status !== 429) {
            // Find a source page containing this link
            const src = pages.find(p => p.externalLinks.some(l => l.href === extUrl));
            if (src) {
              const key = `${src.url}->${extUrl}`;
              if (!brokenLinkKeys.has(key)) {
                brokenLinkKeys.add(key);
                brokenLinks.push({
                  sourcePage: src.url,
                  targetUrl: extUrl,
                  statusCode: res.status,
                  isExternal: true,
                });
              }
            }
          }
        } catch {
          // Ignore external network failures/timeouts
        }
      })
    );

    return {
      pages: updatedPages,
      brokenLinks,
      uniqueExternalDomainsCount: externalDomainsSet.size,
      totalExternalLinksCount: externalLinksSet.size,
    };
  }
}
