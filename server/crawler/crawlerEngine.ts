import { UrlQueue } from './urlQueue';
import { RobotsParser } from './robotsParser';
import { SitemapParser } from './sitemapParser';
import { HtmlAnalyzer } from './htmlAnalyzer';
import { LinkAnalyzer } from './linkAnalyzer';
import { DuplicateContentAnalyzer } from './duplicateContent';
import { RulesEngine } from './rulesEngine';
import { ScoreCalculator } from './scoreCalculator';
import { resolveAndValidateDns } from '../security';
import { CRAWLER_USER_AGENT } from './constants';
import type { CrawledPage, AuditResult, CrawlProgress, AuditErrorDetails } from '../../src/types';

function parseRetryAfter(headerValue: string | null): number | null {
  if (!headerValue) return null;
  const seconds = parseInt(headerValue, 10);
  if (!isNaN(seconds) && seconds > 0 && seconds <= 60) {
    return seconds * 1000;
  }
  const dateMs = Date.parse(headerValue);
  if (!isNaN(dateMs)) {
    const diff = dateMs - Date.now();
    if (diff > 0 && diff <= 60000) return diff;
  }
  return null;
}

export interface CrawlerProgressCallback {
  (progress: CrawlProgress): void;
}

export class AuditExecutionError extends Error {
  public details: AuditErrorDetails;

  constructor(details: AuditErrorDetails) {
    super(details.message);
    this.name = 'AuditExecutionError';
    this.details = details;
  }
}

export class CrawlerEngine {
  private targetUrl: string;
  private maxPages: number;
  private onProgress: CrawlerProgressCallback;
  private isCancelled: boolean = false;

  constructor(targetUrl: string, maxPages: number = 50, onProgress: CrawlerProgressCallback) {
    this.targetUrl = targetUrl;
    this.maxPages = Math.min(Math.max(maxPages, 5), 500);
    this.onProgress = onProgress;
  }

  public cancel(): void {
    this.isCancelled = true;
  }

  public async run(): Promise<AuditResult> {
    const startTime = Date.now();
    const logs: Array<{ time: string; message: string; type?: 'info' | 'success' | 'warn' | 'error' }> = [];

    const emit = (
      step: CrawlProgress['step'],
      statusMessage: string,
      pagesDiscovered: number,
      pagesCrawled: number,
      currentUrl: string,
      percent: number,
      logEntry?: { message: string; type?: 'info' | 'success' | 'warn' | 'error' }
    ) => {
      if (logEntry) {
        const timeStr = new Date().toLocaleTimeString();
        logs.unshift({ time: timeStr, message: logEntry.message, type: logEntry.type || 'info' });
        if (logs.length > 50) logs.pop();
      }

      this.onProgress({
        step,
        statusMessage,
        pagesDiscovered,
        pagesCrawled,
        currentUrl,
        percent: Math.min(100, Math.max(0, Math.round(percent))),
        recentLogs: [...logs],
      });
    };

    try {
      // Step 1: Validating URL
      emit('validating', 'Validating website URL and domain syntax...', 1, 0, this.targetUrl, 2, {
        message: `Auditing target: ${this.targetUrl} (Max: ${this.maxPages} pages)`,
        type: 'info',
      });

      let parsedTarget: URL;
      try {
        parsedTarget = new URL(this.targetUrl);
      } catch {
        throw new AuditExecutionError({
          type: 'invalid_url',
          errorType: 'Invalid URL Format',
          reason: 'INVALID_URL',
          message: 'The entered URL format is invalid. Please check the address.',
          url: this.targetUrl,
        });
      }

      // Step 2: Checking DNS
      emit('dns', `Resolving DNS for ${parsedTarget.hostname}...`, 1, 0, this.targetUrl, 6, {
        message: `Querying DNS records for ${parsedTarget.hostname}`,
        type: 'info',
      });

      const dnsResult = await resolveAndValidateDns(parsedTarget.hostname);
      if (!dnsResult.isValid) {
        throw new AuditExecutionError({
          type: dnsResult.reason === 'SSRF_RESTRICTED_IP' ? 'restricted_ip' : 'dns_failed',
          errorType: dnsResult.errorType || 'DNS Resolution Failed',
          reason: dnsResult.reason || 'ENOTFOUND',
          message: dnsResult.message || 'The domain could not be resolved. Please check the website address.',
          url: this.targetUrl,
        });
      }

      emit('dns', `DNS resolved: ${dnsResult.ip}`, 1, 0, this.targetUrl, 10, {
        message: `Domain ${parsedTarget.hostname} resolved to IP ${dnsResult.ip}`,
        type: 'success',
      });

      // Step 3: Connecting & Following Redirects
      emit('connecting', 'Connecting to website server...', 1, 0, this.targetUrl, 12, {
        message: 'Establishing HTTP/HTTPS connection to target host',
        type: 'info',
      });

      let currentCheckUrl = this.targetUrl;
      const redirectChain: string[] = [currentCheckUrl];
      let initialResponse: Response | null = null;
      let redirectHops = 0;
      const maxRedirectHops = 10;

      while (redirectHops < maxRedirectHops) {
        let res: Response | null = null;
        let attempt = 0;
        const maxAttempts = 3;

        while (attempt < maxAttempts) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 12000);

          try {
            res = await fetch(currentCheckUrl, {
              method: 'GET',
              signal: controller.signal,
              redirect: 'manual',
              headers: {
                'User-Agent': CRAWLER_USER_AGENT,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              },
            });
            clearTimeout(timeoutId);

            if (res.status === 429) {
              attempt++;
              if (attempt < maxAttempts) {
                const retryAfterMs = parseRetryAfter(res.headers.get('retry-after')) || (attempt * 2000);
                emit('connecting', `Server returned HTTP 429 (Rate Limited). Retrying in ${(retryAfterMs / 1000).toFixed(0)}s (attempt ${attempt}/${maxAttempts})...`, 1, 0, currentCheckUrl, 14, {
                  message: `Received HTTP 429 on ${currentCheckUrl}. Backing off ${(retryAfterMs / 1000).toFixed(0)}s before retry ${attempt + 1}...`,
                  type: 'warn',
                });
                await new Promise(resolve => setTimeout(resolve, retryAfterMs));
                continue;
              }
            }

            break;
          } catch (err: any) {
            clearTimeout(timeoutId);
            if (err instanceof AuditExecutionError) throw err;

            const code = err.code || (err.name === 'AbortError' ? 'ETIMEDOUT' : 'NETWORK_ERROR');
            if (code === 'ECONNREFUSED') {
              throw new AuditExecutionError({
                type: 'connection_refused',
                errorType: 'Connection Refused',
                reason: 'ECONNREFUSED',
                message: 'Website server refused the connection. The server may be offline or port is closed.',
                url: currentCheckUrl,
                canRetry: true,
              });
            }
            if (code === 'ETIMEDOUT' || err.name === 'AbortError') {
              throw new AuditExecutionError({
                type: 'timeout',
                errorType: 'Connection Timed Out',
                reason: 'ETIMEDOUT',
                message: 'Website server took too long to respond (timeout of 12 seconds exceeded).',
                url: currentCheckUrl,
                canRetry: true,
              });
            }
            if (code === 'ENETUNREACH' || code === 'EHOSTUNREACH') {
              throw new AuditExecutionError({
                type: 'unreachable',
                errorType: 'Server Unreachable',
                reason: code,
                message: 'Website server is unreachable over the network.',
                url: currentCheckUrl,
                canRetry: true,
              });
            }
            throw new AuditExecutionError({
              type: 'connection_refused',
              errorType: 'Connection Failed',
              reason: code,
              message: `Failed to connect to website: ${err.message || code}`,
              url: currentCheckUrl,
              canRetry: true,
            });
          }
        }

        if (!res) {
          throw new AuditExecutionError({
            type: 'connection_refused',
            errorType: 'Connection Failed',
            reason: 'NO_RESPONSE',
            message: 'Failed to obtain a response from website server.',
            url: currentCheckUrl,
            canRetry: true,
          });
        }

        if (res.status >= 300 && res.status < 400) {
          redirectHops++;
          const location = res.headers.get('location');
          if (!location) {
            initialResponse = res;
            break;
          }

          const nextUrl = new URL(location, currentCheckUrl).toString();

          // Detect redirect loop
          if (redirectChain.includes(nextUrl)) {
            throw new AuditExecutionError({
              type: 'redirect_loop',
              errorType: 'Redirect Loop Detected',
              reason: 'ERR_TOO_MANY_REDIRECTS',
              message: `Target website has a circular redirect loop: ${[...redirectChain, nextUrl].join(' -> ')}`,
              url: this.targetUrl,
              statusCode: res.status,
              canRetry: false,
            });
          }

          redirectChain.push(nextUrl);

          // Re-check DNS if redirect changes hostname
          const nextParsed = new URL(nextUrl);
          if (nextParsed.hostname.toLowerCase() !== new URL(currentCheckUrl).hostname.toLowerCase()) {
            const nextDns = await resolveAndValidateDns(nextParsed.hostname);
            if (!nextDns.isValid) {
              throw new AuditExecutionError({
                type: nextDns.reason === 'SSRF_RESTRICTED_IP' ? 'restricted_ip' : 'dns_failed',
                errorType: nextDns.errorType || 'DNS Resolution Failed on Redirect',
                reason: nextDns.reason || 'ENOTFOUND',
                message: `Redirect target domain (${nextParsed.hostname}) could not be resolved.`,
                url: nextUrl,
                canRetry: false,
              });
            }
          }

          emit('redirects', `Following HTTP ${res.status} redirect...`, 1, 0, nextUrl, 15, {
            message: `Redirect ${res.status}: ${currentCheckUrl} -> ${nextUrl}`,
            type: 'info',
          });

          currentCheckUrl = nextUrl;
          continue;
        }

        initialResponse = res;
        break;
      }

      if (!initialResponse) {
        throw new AuditExecutionError({
          type: 'redirect_loop',
          errorType: 'Too Many Redirects',
          reason: 'ERR_TOO_MANY_REDIRECTS',
          message: 'Target website exceeded maximum limit of 10 consecutive redirects.',
          url: this.targetUrl,
          canRetry: false,
        });
      }

      // Check root response status code
      const rootStatus = initialResponse.status;
      if (rootStatus === 429) {
        throw new AuditExecutionError({
          type: 'rate_limited',
          errorType: 'Rate Limited (HTTP 429)',
          reason: 'HTTP_429',
          message: 'The website is reachable, but the server temporarily limited crawler requests (HTTP 429). The website firewall or host is actively rate-limiting automated requests.',
          url: currentCheckUrl,
          statusCode: 429,
          canRetry: true,
          rateLimitInfo: {
            pagesAnalyzed: 0,
            pagesRateLimited: 1,
            pagesRemaining: this.maxPages,
            retryAfterSeconds: 30,
          },
        });
      }
      if (rootStatus === 404 || rootStatus === 410) {
        throw new AuditExecutionError({
          type: 'not_found',
          errorType: 'Website Root Page Not Found (HTTP 404)',
          reason: `HTTP_${rootStatus}`,
          message: `The website root URL returned HTTP ${rootStatus} (Not Found). A valid website root page is required to perform an SEO audit.`,
          url: currentCheckUrl,
          statusCode: rootStatus,
          canRetry: false,
        });
      }
      if (rootStatus >= 500) {
        throw new AuditExecutionError({
          type: 'server_error',
          errorType: `Server Error (HTTP ${rootStatus})`,
          reason: `HTTP_${rootStatus}`,
          message: `The website server returned an internal server error (HTTP ${rootStatus}). The server may be experiencing downtime or misconfiguration.`,
          url: currentCheckUrl,
          statusCode: rootStatus,
          canRetry: true,
        });
      }
      if (rootStatus === 401 || rootStatus === 403) {
        throw new AuditExecutionError({
          type: 'forbidden',
          errorType: `Access Denied / Forbidden (HTTP ${rootStatus})`,
          reason: `HTTP_${rootStatus}`,
          message: `The website blocked crawler access with HTTP ${rootStatus} (${rootStatus === 403 ? 'Forbidden' : 'Unauthorized'}). The server or firewall denied access to this crawler.`,
          url: currentCheckUrl,
          statusCode: rootStatus,
          canRetry: false,
        });
      }

      // Update targetUrl and baseHostname to final resolved target
      this.targetUrl = currentCheckUrl;
      const finalParsed = new URL(this.targetUrl);
      const baseHostname = finalParsed.hostname.toLowerCase().replace(/^www\./, '');

      // Step 4: Checking robots.txt
      emit('robots', 'Checking robots.txt...', 1, 0, new URL('/robots.txt', this.targetUrl).toString(), 18, {
        message: 'Fetching and analyzing /robots.txt',
        type: 'info',
      });
      const robotsAnalysis = await RobotsParser.fetchAndParse(this.targetUrl);

      if (robotsAnalysis.exists) {
        emit('robots', 'Parsed robots.txt rules and directives', 1, 0, robotsAnalysis.url, 22, {
          message: `robots.txt found with ${robotsAnalysis.sitemaps.length} declared sitemap(s) and ${robotsAnalysis.blockedPaths.length} blocked path(s)`,
          type: 'success',
        });
      } else {
        emit('robots', 'No robots.txt detected', 1, 0, robotsAnalysis.url, 22, {
          message: 'robots.txt not found (404), proceeding with standard crawl allowances',
          type: 'warn',
        });
      }

      // Step 5: Discovering Sitemap
      emit('sitemap', 'Discovering and parsing XML sitemaps...', 1, 0, this.targetUrl, 25, {
        message: 'Searching for XML sitemaps from robots.txt and standard locations',
        type: 'info',
      });
      const sitemapAnalysis = await SitemapParser.discoverAndParse(this.targetUrl, robotsAnalysis.sitemaps);

      const queue = new UrlQueue(this.targetUrl, this.maxPages);
      if (sitemapAnalysis.exists && sitemapAnalysis.urls.length > 0) {
        const addedFromSitemap = queue.addBatch(sitemapAnalysis.urls.slice(0, this.maxPages * 2));
        emit('sitemap', `Imported ${addedFromSitemap} URLs from XML sitemap`, queue.discoveredCount, 0, sitemapAnalysis.url, 28, {
          message: `Discovered XML sitemap with ${sitemapAnalysis.totalUrls} URLs (queued ${addedFromSitemap} internal candidates)`,
          type: 'success',
        });
      }

      // Step 6: Crawling Pages
      const crawledPages: CrawledPage[] = [];
      const pageTexts: Array<{ url: string; text: string }> = [];
      let consecutiveRateLimits = 0;
      let totalRateLimitedPages = 0;
      let crawlDelayMs = 250;
      let isPartialCrawl = false;

      emit('crawling', 'Starting website crawl...', queue.discoveredCount, 0, this.targetUrl, 30, {
        message: 'Beginning deep page crawling and DOM analysis',
        type: 'info',
      });

    while (queue.hasNext() && !this.isCancelled) {
      const currentUrl = queue.next();
      if (!currentUrl) break;

      // Respect robots.txt Disallow
      try {
        const parsedCurrent = new URL(currentUrl);
        if (!RobotsParser.isUrlAllowed(parsedCurrent.pathname, robotsAnalysis.blockedPaths)) {
          continue;
        }
      } catch {
        continue;
      }

      // Check if target website is returning persistent 429s (rate limited)
      if (consecutiveRateLimits >= 3 || totalRateLimitedPages >= 4) {
        const successfulPages = crawledPages.filter(p => p.statusCode >= 200 && p.statusCode < 400);
        if (successfulPages.length > 0) {
          isPartialCrawl = true;
          emit('crawling', `Crawl safely paused: Server rate-limiting requests. Generating partial audit for ${successfulPages.length} analyzed page(s)...`, queue.discoveredCount, crawledPages.length, currentUrl, 72, {
            message: `Target server rate limit reached (HTTP 429). Halting crawl safely and preserving verified results for ${successfulPages.length} page(s).`,
            type: 'warn',
          });
          break;
        } else {
          throw new AuditExecutionError({
            type: 'rate_limited',
            errorType: 'Rate Limited (HTTP 429)',
            reason: 'HTTP_429',
            message: 'The website is reachable, but the server temporarily limited crawler requests (HTTP 429). No pages could be analyzed.',
            url: this.targetUrl,
            statusCode: 429,
            canRetry: true,
            rateLimitInfo: {
              pagesAnalyzed: 0,
              pagesRateLimited: totalRateLimitedPages,
              pagesRemaining: queue.queueLength + 1,
              retryAfterSeconds: 30,
            },
          });
        }
      }

      const crawlPercent = 30 + Math.floor((crawledPages.length / this.maxPages) * 45);
      emit(
        'crawling',
        `Crawling page ${crawledPages.length + 1} of ${this.maxPages}...`,
        queue.discoveredCount,
        crawledPages.length,
        currentUrl,
        crawlPercent,
        {
          message: `Crawling: ${currentUrl}`,
          type: 'info',
        }
      );

      try {
        const fetchStart = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        let response = await fetch(currentUrl, {
          signal: controller.signal,
          redirect: 'follow',
          headers: {
            'User-Agent': CRAWLER_USER_AGENT,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        });
        clearTimeout(timeoutId);

        // If 429 encountered, attempt one respectful backoff retry if not in consecutive limit cascade
        if (response.status === 429 && consecutiveRateLimits < 2) {
          const retryAfterMs = parseRetryAfter(response.headers.get('retry-after')) || 2500;
          emit('crawling', `HTTP 429 received on ${currentUrl.slice(0, 45)}. Backing off ${(retryAfterMs / 1000).toFixed(0)}s...`, queue.discoveredCount, crawledPages.length, currentUrl, crawlPercent, {
            message: `Target server issued HTTP 429 on ${currentUrl}. Pausing ${(retryAfterMs / 1000).toFixed(0)}s before single retry...`,
            type: 'warn',
          });
          await new Promise(resolve => setTimeout(resolve, retryAfterMs));

          const retryController = new AbortController();
          const retryTimeoutId = setTimeout(() => retryController.abort(), 12000);
          try {
            const retryRes = await fetch(currentUrl, {
              signal: retryController.signal,
              redirect: 'follow',
              headers: {
                'User-Agent': CRAWLER_USER_AGENT,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
              },
            });
            clearTimeout(retryTimeoutId);
            response = retryRes;
          } catch {
            clearTimeout(retryTimeoutId);
          }
        }

        const loadTimeMs = Date.now() - fetchStart;
        const statusCode = response.status;
        const finalUrl = response.url || currentUrl;
        const contentType = response.headers.get('content-type') || '';
        const redirectChain: string[] = response.redirected ? [currentUrl, finalUrl] : [];

        let statusType: '2xx' | '3xx' | '4xx' | '5xx' | 'error' = '2xx';
        if (statusCode >= 200 && statusCode < 300) statusType = '2xx';
        else if (statusCode >= 300 && statusCode < 400) statusType = '3xx';
        else if (statusCode >= 400 && statusCode < 500) statusType = '4xx';
        else if (statusCode >= 500) statusType = '5xx';

        if (statusCode === 429) {
          consecutiveRateLimits++;
          totalRateLimitedPages++;
          crawlDelayMs = Math.min(2000, crawlDelayMs + 400);
        } else {
          consecutiveRateLimits = 0;
        }

        // Only parse HTML responses
        if (contentType.includes('text/html') || contentType.includes('application/xhtml+xml') || !contentType) {
          const html = await response.text();
          const sizeBytes = Buffer.byteLength(html, 'utf-8');

          const { page, rawText, discoveredInternalHrefs } = HtmlAnalyzer.analyzePage(
            currentUrl,
            html,
            statusCode,
            statusType,
            redirectChain,
            finalUrl,
            contentType,
            loadTimeMs,
            sizeBytes,
            baseHostname
          );

          crawledPages.push(page);
          pageTexts.push({ url: currentUrl, text: rawText });

          // Queue new discovered internal links
          const newlyQueued = queue.addBatch(discoveredInternalHrefs);
          if (newlyQueued > 0) {
            emit(
              'crawling',
              `Discovered ${newlyQueued} new internal links on ${currentUrl.slice(0, 45)}...`,
              queue.discoveredCount,
              crawledPages.length,
              currentUrl,
              crawlPercent
            );
          }
        } else {
          // Non-HTML page (e.g. redirected or binary)
          crawledPages.push({
            url: currentUrl,
            statusCode,
            statusType,
            redirectChain,
            finalUrl,
            contentType,
            loadTimeMs,
            sizeBytes: 0,
            title: { text: '', length: 0, status: 'missing' },
            metaDescription: { text: '', length: 0, status: 'missing' },
            h1: { text: [], count: 0, status: 'missing' },
            headings: { h1: [], h2: [], h3: [], h4: [], h5: [], h6: [], issues: [] },
            images: [],
            canonical: { url: null, status: 'missing' },
            robotsMeta: { noindex: false, nofollow: false, noarchive: false, nosnippet: false, raw: null },
            wordCount: 0,
            textLength: 0,
            textToHtmlRatio: 0,
            isThinContent: true,
            internalLinks: [],
            externalLinks: [],
            incomingInternalLinksCount: 0,
            isOrphan: false,
            schemaTypes: [],
            hasStructuredData: false,
            lang: null,
            openGraph: {},
            htmlDoc: { hasDoctype: false, hasLang: false, hasViewport: false, issues: [] },
            urlIssues: [],
            httpsInfo: { isHttps: currentUrl.startsWith('https://'), mixedContent: [] },
            issuesCount: { critical: 0, warning: 0, info: 0 },
          });
        }
      } catch (err: any) {
        crawledPages.push({
          url: currentUrl,
          statusCode: 0,
          statusType: 'error',
          redirectChain: [],
          finalUrl: currentUrl,
          contentType: '',
          loadTimeMs: 0,
          sizeBytes: 0,
          title: { text: '', length: 0, status: 'missing' },
          metaDescription: { text: '', length: 0, status: 'missing' },
          h1: { text: [], count: 0, status: 'missing' },
          headings: { h1: [], h2: [], h3: [], h4: [], h5: [], h6: [], issues: [] },
          images: [],
          canonical: { url: null, status: 'missing' },
          robotsMeta: { noindex: false, nofollow: false, noarchive: false, nosnippet: false, raw: null },
          wordCount: 0,
          textLength: 0,
          textToHtmlRatio: 0,
          isThinContent: true,
          internalLinks: [],
          externalLinks: [],
          incomingInternalLinksCount: 0,
          isOrphan: false,
          schemaTypes: [],
          hasStructuredData: false,
          lang: null,
          openGraph: {},
          htmlDoc: { hasDoctype: false, hasLang: false, hasViewport: false, issues: ['Connection failed or timed out'] },
          urlIssues: [],
          httpsInfo: { isHttps: currentUrl.startsWith('https://'), mixedContent: [] },
          issuesCount: { critical: 1, warning: 0, info: 0 },
        });

        emit('crawling', `Failed to crawl: ${currentUrl}`, queue.discoveredCount, crawledPages.length, currentUrl, crawlPercent, {
          message: `Connection error on ${currentUrl}: ${err.message || 'Timeout'}`,
          type: 'error',
        });
      }

      // Polite rate-limiting delay between requests
      await new Promise(resolve => setTimeout(resolve, crawlDelayMs));
    }

    if (crawledPages.length === 0) {
      if (totalRateLimitedPages > 0) {
        throw new AuditExecutionError({
          type: 'rate_limited',
          errorType: 'Rate Limited (HTTP 429)',
          reason: 'HTTP_429',
          message: 'The website is reachable, but the server temporarily limited crawler requests (HTTP 429). No pages could be analyzed.',
          url: this.targetUrl,
          statusCode: 429,
          canRetry: true,
          rateLimitInfo: {
            pagesAnalyzed: 0,
            pagesRateLimited: totalRateLimitedPages,
            pagesRemaining: queue.queueLength + 1,
            retryAfterSeconds: 30,
          },
        });
      }
      throw new AuditExecutionError({
        type: 'crawl_error',
        errorType: 'Crawl Incomplete',
        reason: 'NO_PAGES_CRAWLED',
        message: 'No valid pages could be crawled from the target website.',
        url: this.targetUrl,
        canRetry: true,
      });
    }

    // Step 7: Analyzing Link Structure & Broken Links
    emit('analyzing_links', 'Building internal link graph and checking broken links...', queue.discoveredCount, crawledPages.length, this.targetUrl, 78, {
      message: `Analyzing incoming and outgoing link relationships across ${crawledPages.length} pages`,
      type: 'info',
    });
    const {
      pages: pagesWithLinks,
      brokenLinks,
      uniqueExternalDomainsCount,
      totalExternalLinksCount,
    } = await LinkAnalyzer.analyzeLinks(crawledPages, sitemapAnalysis.urls);

    // Step 8: Internal Duplicate Content Detection
    emit('analyzing_duplicates', 'Running internal duplicate content detection...', queue.discoveredCount, crawledPages.length, this.targetUrl, 86, {
      message: 'Computing pairwise shingling and Jaccard similarity across page texts',
      type: 'info',
    });
    const duplicatePairs = DuplicateContentAnalyzer.analyze(pageTexts);

    // Step 9: Running SEO Rules Engine
    emit('calculating_scores', 'Evaluating SEO rules and calculating health scores...', queue.discoveredCount, crawledPages.length, this.targetUrl, 92, {
      message: 'Running technical, on-page, and link architecture rule validation',
      type: 'info',
    });
    const { issues, pagesWithCounts } = RulesEngine.evaluateRules(
      pagesWithLinks,
      robotsAnalysis,
      sitemapAnalysis,
      duplicatePairs,
      brokenLinks
    );

    // Step 10: Calculating FWSC SEO Health Score
    const scores = ScoreCalculator.calculate(issues);

    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    const infoCount = issues.filter(i => i.severity === 'info').length;
    const passedCount = issues.filter(i => i.severity === 'passed').length;

    const auditId = 'audit_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const durationMs = Date.now() - startTime;

    const isPartial = isPartialCrawl || totalRateLimitedPages > 0;
    const successfulPagesCount = pagesWithCounts.filter(p => p.statusCode >= 200 && p.statusCode < 400).length;

    const auditResult: AuditResult = {
      id: auditId,
      websiteUrl: this.targetUrl,
      normalizedDomain: baseHostname,
      maxPages: this.maxPages,
      createdAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      durationMs,
      scores,
      pagesCrawledCount: pagesWithCounts.length,
      pagesDiscoveredCount: queue.discoveredCount,
      isPartial,
      rateLimitInfo: isPartial ? {
        pagesAnalyzed: successfulPagesCount,
        pagesRateLimited: totalRateLimitedPages,
        pagesRemaining: queue.queueLength,
        message: `The host server rate-limited automated requests (HTTP 429). The crawler stopped safely to protect server resources and compiled verified audit metrics for ${successfulPagesCount} analyzed page(s).`,
      } : undefined,
      issueCounts: {
        total: criticalCount + warningCount + infoCount,
        critical: criticalCount,
        warning: warningCount,
        info: infoCount,
        passed: passedCount,
      },
      pages: pagesWithCounts,
      issues,
      duplicatePairs,
      robotsAnalysis,
      sitemapAnalysis,
      brokenLinks,
      externalDomainsCount: uniqueExternalDomainsCount,
      totalExternalLinksCount,
    };

    emit('completed', 'Audit completed successfully! Generating report...', queue.discoveredCount, pagesWithCounts.length, this.targetUrl, 100, {
      message: `Audit completed in ${(durationMs / 1000).toFixed(1)}s! FWSC Health Score: ${scores.overall}/100 (${scores.status})`,
      type: 'success',
    });

    return auditResult;
    } catch (err: any) {
      const errorDetails: AuditErrorDetails = err instanceof AuditExecutionError
        ? err.details
        : {
            type: 'crawl_error',
            errorType: 'Audit Failed',
            reason: err.code || 'UNKNOWN_ERROR',
            message: err.message || 'An unexpected error occurred during the audit.',
            url: this.targetUrl,
          };

      emit('failed', errorDetails.message, 0, 0, this.targetUrl, 0, {
        message: `Audit failed: ${errorDetails.message}`,
        type: 'error',
      });

      throw err;
    }
  }
}
