import type { RobotsAnalysis } from '../../src/types';

export class RobotsParser {
  static async fetchAndParse(baseUrl: string): Promise<RobotsAnalysis> {
    const robotsUrl = new URL('/robots.txt', baseUrl).toString();
    const result: RobotsAnalysis = {
      exists: false,
      url: robotsUrl,
      content: '',
      sitemaps: [],
      blockedPaths: [],
      issues: [],
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(robotsUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DigiVirusBot/1.0; +https://digivirus.in/bot)',
          'Accept': 'text/plain,text/html,*/*',
        },
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          result.issues.push('robots.txt was not found (404). Search engines will assume everything is crawlable, but having one is recommended.');
        } else {
          result.issues.push(`robots.txt returned HTTP status ${response.status}.`);
        }
        return result;
      }

      const contentType = response.headers.get('content-type') || '';
      const text = await response.text();

      // Basic sanity check: if it returned HTML instead of text (e.g. standard 404 error page returning 200)
      if (contentType.includes('text/html') && text.toLowerCase().includes('<!doctype html>')) {
        result.issues.push('robots.txt returned an HTML document instead of plain text.');
        return result;
      }

      result.exists = true;
      result.content = text;

      // Parse lines
      const lines = text.split(/\r?\n/);
      let isRelevantAgent = true;

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;

        const colonIdx = line.indexOf(':');
        if (colonIdx === -1) {
          result.issues.push(`Invalid syntax in robots.txt: "${line}"`);
          continue;
        }

        const directive = line.substring(0, colonIdx).trim().toLowerCase();
        const value = line.substring(colonIdx + 1).trim();

        if (directive === 'user-agent') {
          const agent = value.toLowerCase();
          isRelevantAgent = agent === '*' || agent.includes('digivirus') || agent.includes('googlebot');
        } else if (directive === 'sitemap') {
          try {
            const sitemapUrl = new URL(value, baseUrl).toString();
            if (!result.sitemaps.includes(sitemapUrl)) {
              result.sitemaps.push(sitemapUrl);
            }
          } catch {
            result.issues.push(`Invalid sitemap URL found in robots.txt: "${value}"`);
          }
        } else if (directive === 'disallow' && isRelevantAgent) {
          if (value && !result.blockedPaths.includes(value)) {
            result.blockedPaths.push(value);
          }
        }
      }

      if (result.blockedPaths.includes('/')) {
        result.issues.push('Critical: Entire site is disallowed ("Disallow: /") in robots.txt for crawlers!');
      }

      if (result.sitemaps.length === 0) {
        result.issues.push('No Sitemap directive declared in robots.txt.');
      }
    } catch (err: any) {
      result.issues.push(`Failed to fetch robots.txt: ${err.message || 'Connection timeout or network error'}`);
    }

    return result;
  }

  static isUrlAllowed(urlPath: string, blockedPaths: string[]): boolean {
    for (const blocked of blockedPaths) {
      if (blocked === '') continue;
      if (blocked === '/' && urlPath.length > 0) return false;
      if (urlPath.startsWith(blocked)) return false;
    }
    return true;
  }
}
