import type { SitemapAnalysis } from '../../src/types';

export class SitemapParser {
  static async discoverAndParse(baseUrl: string, declaredSitemaps: string[] = []): Promise<SitemapAnalysis> {
    const candidateUrls: string[] = [...declaredSitemaps];

    // Add standard candidate locations
    const defaultSitemaps = [
      new URL('/sitemap.xml', baseUrl).toString(),
      new URL('/sitemap_index.xml', baseUrl).toString(),
      new URL('/wp-sitemap.xml', baseUrl).toString(),
    ];

    for (const def of defaultSitemaps) {
      if (!candidateUrls.includes(def)) {
        candidateUrls.push(def);
      }
    }

    const result: SitemapAnalysis = {
      exists: false,
      url: '',
      totalUrls: 0,
      urls: [],
      errors: [],
      redirected: [],
      unreachableUrls: [],
    };

    const visitedSitemaps = new Set<string>();
    const discoveredUrls = new Set<string>();

    for (const sitemapUrl of candidateUrls) {
      if (visitedSitemaps.has(sitemapUrl)) continue;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(sitemapUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; DigiVirusBot/1.0; +https://digivirus.in/bot)',
            'Accept': 'application/xml,text/xml,*/*',
          },
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          result.errors.push({ url: sitemapUrl, status: response.status });
          continue;
        }

        // Check if redirected
        if (response.redirected && response.url !== sitemapUrl) {
          result.redirected.push({ url: sitemapUrl, to: response.url });
        }

        const xmlText = await response.text();
        visitedSitemaps.add(sitemapUrl);

        if (!result.exists) {
          result.exists = true;
          result.url = sitemapUrl;
        }

        // Extract nested sitemaps if this is a sitemapindex
        const sitemapIndexMatches = xmlText.matchAll(/<sitemap>[\s\S]*?<loc>(.*?)<\/loc>[\s\S]*?<\/sitemap>/gi);
        const nestedSitemaps: string[] = [];
        for (const match of sitemapIndexMatches) {
          const loc = match[1]?.trim();
          if (loc && !visitedSitemaps.has(loc) && nestedSitemaps.length < 5) {
            nestedSitemaps.push(loc);
          }
        }

        // Recursively fetch top nested sitemaps if index
        for (const nested of nestedSitemaps) {
          try {
            const nestedRes = await fetch(nested, {
              headers: { 'User-Agent': 'DigiVirusBot/1.0' },
            });
            if (nestedRes.ok) {
              const nestedText = await nestedRes.text();
              const urlMatches = nestedText.matchAll(/<url>[\s\S]*?<loc>(.*?)<\/loc>[\s\S]*?<\/url>/gi);
              for (const uMatch of urlMatches) {
                const loc = uMatch[1]?.trim();
                if (loc) discoveredUrls.add(loc);
              }
            }
          } catch {
            result.unreachableUrls.push(nested);
          }
        }

        // Extract regular URLs
        const directUrlMatches = xmlText.matchAll(/<url>[\s\S]*?<loc>(.*?)<\/loc>[\s\S]*?<\/url>/gi);
        for (const uMatch of directUrlMatches) {
          const loc = uMatch[1]?.trim();
          if (loc) discoveredUrls.add(loc);
        }

        // If we found URLs, we don't need to try remaining default fallback candidates
        if (discoveredUrls.size > 0) {
          break;
        }
      } catch (err: any) {
        result.unreachableUrls.push(sitemapUrl);
      }
    }

    result.urls = Array.from(discoveredUrls);
    result.totalUrls = result.urls.length;
    return result;
  }
}
