import * as cheerio from 'cheerio';
import type { CrawledPage, PageHeadingStructure, PageImage, PageLink } from '../../src/types';

export class HtmlAnalyzer {
  static analyzePage(
    url: string,
    html: string,
    statusCode: number,
    statusType: '2xx' | '3xx' | '4xx' | '5xx' | 'error',
    redirectChain: string[],
    finalUrl: string,
    contentType: string,
    loadTimeMs: number,
    sizeBytes: number,
    baseHostname: string
  ): { page: CrawledPage; rawText: string; discoveredInternalHrefs: string[] } {
    const $ = cheerio.load(html);

    // 1. Title Tag
    const titleEls = $('title');
    const titleText = titleEls.first().text().trim();
    const titleLength = titleText.length;
    let titleStatus: 'ok' | 'missing' | 'too_short' | 'too_long' | 'duplicate' = 'ok';
    if (titleEls.length === 0 || !titleText) {
      titleStatus = 'missing';
    } else if (titleLength < 30) {
      titleStatus = 'too_short';
    } else if (titleLength > 60) {
      titleStatus = 'too_long';
    }

    // 2. Meta Description
    const metaDescEls = $('meta[name="description" i], meta[property="og:description" i]');
    const metaDescText = (metaDescEls.first().attr('content') || '').trim();
    const metaDescLength = metaDescText.length;
    let metaDescStatus: 'ok' | 'missing' | 'too_short' | 'too_long' | 'duplicate' = 'ok';
    if (!metaDescText) {
      metaDescStatus = 'missing';
    } else if (metaDescLength < 70) {
      metaDescStatus = 'too_short';
    } else if (metaDescLength > 160) {
      metaDescStatus = 'too_long';
    }

    // 3. Headings Analysis (H1..H6)
    const headings: PageHeadingStructure = {
      h1: [],
      h2: [],
      h3: [],
      h4: [],
      h5: [],
      h6: [],
      issues: [],
    };

    $('h1').each((_, el) => {
      const text = $(el).text().trim();
      if (text) headings.h1.push(text);
    });
    $('h2').each((_, el) => {
      const text = $(el).text().trim();
      if (text) headings.h2.push(text);
    });
    $('h3').each((_, el) => {
      const text = $(el).text().trim();
      if (text) headings.h3.push(text);
    });
    $('h4').each((_, el) => {
      const text = $(el).text().trim();
      if (text) headings.h4.push(text);
    });
    $('h5').each((_, el) => {
      const text = $(el).text().trim();
      if (text) headings.h5.push(text);
    });
    $('h6').each((_, el) => {
      const text = $(el).text().trim();
      if (text) headings.h6.push(text);
    });

    // Check heading hierarchy order in DOM
    const headingElements: Array<{ level: number; text: string }> = [];
    $('h1, h2, h3, h4, h5, h6').each((_, el) => {
      const tagName = (el as any).tagName?.toLowerCase() || '';
      const level = parseInt(tagName.replace('h', ''), 10);
      if (level >= 1 && level <= 6) {
        headingElements.push({ level, text: $(el).text().trim() });
      }
    });

    for (let i = 0; i < headingElements.length - 1; i++) {
      const current = headingElements[i];
      const next = headingElements[i + 1];
      if (next.level > current.level + 1) {
        headings.issues.push(`Heading level skipped: H${current.level} directly followed by H${next.level} ("${next.text.slice(0, 40)}...")`);
      }
    }

    let h1Status: 'ok' | 'missing' | 'multiple' | 'empty' = 'ok';
    if (headings.h1.length === 0) {
      h1Status = $('h1').length > 0 ? 'empty' : 'missing';
    } else if (headings.h1.length > 1) {
      h1Status = 'multiple';
    }

    // 4. Images Analysis
    const images: PageImage[] = [];
    $('img').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || '';
      const alt = $(el).attr('alt');
      const missingAlt = typeof alt === 'undefined';
      const emptyAlt = !missingAlt && alt.trim().length === 0;

      if (src && !src.startsWith('data:image')) {
        try {
          const absoluteSrc = new URL(src, url).toString();
          images.push({
            src: absoluteSrc,
            alt: alt || '',
            missingAlt,
            emptyAlt,
          });
        } catch {
          images.push({
            src,
            alt: alt || '',
            missingAlt,
            emptyAlt,
          });
        }
      }
    });

    // 5. Canonical Tag Analysis
    const canonicalEls = $('link[rel="canonical" i]');
    let canonicalUrl: string | null = null;
    let canonicalStatus: 'ok' | 'missing' | 'multiple' | 'cross_domain' | 'mismatch' = 'ok';

    if (canonicalEls.length === 0) {
      canonicalStatus = 'missing';
    } else if (canonicalEls.length > 1) {
      canonicalStatus = 'multiple';
      canonicalUrl = canonicalEls.first().attr('href') || null;
    } else {
      const href = canonicalEls.first().attr('href');
      if (href) {
        try {
          const parsedCanonical = new URL(href, url);
          canonicalUrl = parsedCanonical.toString();

          const canHost = parsedCanonical.hostname.toLowerCase().replace(/^www\./, '');
          if (canHost !== baseHostname && !canHost.endsWith('.' + baseHostname)) {
            canonicalStatus = 'cross_domain';
          } else if (canonicalUrl.replace(/\/$/, '') !== url.replace(/\/$/, '')) {
            canonicalStatus = 'mismatch';
          }
        } catch {
          canonicalStatus = 'missing';
        }
      } else {
        canonicalStatus = 'missing';
      }
    }

    // 6. Robots Meta Tag
    const robotsMetaEls = $('meta[name="robots" i], meta[name="googlebot" i]');
    const rawRobots = robotsMetaEls.map((_, el) => $(el).attr('content')).get().join(', ');
    const lowerRobots = rawRobots.toLowerCase();
    const robotsMeta = {
      noindex: lowerRobots.includes('noindex'),
      nofollow: lowerRobots.includes('nofollow'),
      noarchive: lowerRobots.includes('noarchive'),
      nosnippet: lowerRobots.includes('nosnippet'),
      raw: rawRobots || null,
    };

    // 7. Content Analysis (Visible Text)
    // Remove script, style, noscript, svg, nav, footer for clean content inspection
    const contentClone = cheerio.load(html);
    contentClone('script, style, noscript, svg, link, meta').remove();
    const rawText = contentClone('body').text().replace(/\s+/g, ' ').trim();
    const words = rawText ? rawText.split(/\s+/).filter(w => w.length > 0) : [];
    const wordCount = words.length;
    const textLength = rawText.length;
    const htmlLength = html.length;
    const textToHtmlRatio = htmlLength > 0 ? parseFloat(((textLength / htmlLength) * 100).toFixed(2)) : 0;
    const isThinContent = wordCount < 200;

    // 8. Links Extraction (Internal vs External)
    const internalLinks: PageLink[] = [];
    const externalLinks: PageLink[] = [];
    const discoveredInternalHrefs: string[] = [];
    const seenInternalHrefs = new Set<string>();

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href')?.trim();
      const text = $(el).text().trim().replace(/\s+/g, ' ') || 'Link (No Anchor)';
      if (!href) return;

      const lower = href.toLowerCase();
      if (
        lower.startsWith('javascript:') ||
        lower.startsWith('mailto:') ||
        lower.startsWith('tel:') ||
        lower.startsWith('#')
      ) {
        return;
      }

      try {
        const absolute = new URL(href, url);
        // Only http/https
        if (absolute.protocol !== 'http:' && absolute.protocol !== 'https:') return;

        absolute.hash = '';
        const absHref = absolute.toString();
        const host = absolute.hostname.toLowerCase().replace(/^www\./, '');
        const isInternal = host === baseHostname || host.endsWith('.' + baseHostname);

        if (isInternal) {
          if (!seenInternalHrefs.has(absHref)) {
            seenInternalHrefs.add(absHref);
            internalLinks.push({ href: absHref, text, isExternal: false });
            discoveredInternalHrefs.push(absHref);
          }
        } else {
          externalLinks.push({ href: absHref, text, isExternal: true });
        }
      } catch {
        // invalid URL ignore
      }
    });

    // 9. Structured Data Detection (JSON-LD & Microdata)
    const schemaTypes: string[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const jsonContent = $(el).html();
        if (jsonContent) {
          const parsed = JSON.parse(jsonContent);
          const extractType = (obj: any) => {
            if (!obj) return;
            if (obj['@type']) {
              if (Array.isArray(obj['@type'])) {
                schemaTypes.push(...obj['@type']);
              } else if (typeof obj['@type'] === 'string') {
                schemaTypes.push(obj['@type']);
              }
            }
            if (obj['@graph'] && Array.isArray(obj['@graph'])) {
              obj['@graph'].forEach(extractType);
            }
          };
          if (Array.isArray(parsed)) {
            parsed.forEach(extractType);
          } else {
            extractType(parsed);
          }
        }
      } catch {
        schemaTypes.push('Malformed JSON-LD');
      }
    });

    $('[itemtype]').each((_, el) => {
      const itemType = $(el).attr('itemtype');
      if (itemType) {
        const parts = itemType.split('/');
        const name = parts[parts.length - 1];
        if (name && !schemaTypes.includes(name)) {
          schemaTypes.push(name);
        }
      }
    });

    // 10. Language Analysis
    const lang = $('html').attr('lang')?.trim() || null;

    // 11. Open Graph & Twitter Cards
    const openGraph = {
      title: $('meta[property="og:title" i]').attr('content')?.trim(),
      description: $('meta[property="og:description" i]').attr('content')?.trim(),
      image: $('meta[property="og:image" i]').attr('content')?.trim(),
      url: $('meta[property="og:url" i]').attr('content')?.trim(),
      twitterCard: $('meta[name="twitter:card" i]').attr('content')?.trim(),
    };

    // 12. HTML Document Analysis
    const hasDoctype = /<!doctype\s+html/i.test(html);
    const hasLang = Boolean(lang);
    const hasViewport = $('meta[name="viewport" i]').length > 0;
    const charset = $('meta[charset]').attr('charset') || $('meta[http-equiv="content-type" i]').attr('content');
    const htmlIssues: string[] = [];
    if (!hasDoctype) htmlIssues.push('Missing HTML5 <!DOCTYPE html> declaration.');
    if (!hasLang) htmlIssues.push('Missing "lang" attribute on <html> element.');
    if (!hasViewport) htmlIssues.push('Missing responsive <meta name="viewport"> tag.');
    if (!charset) htmlIssues.push('Missing character encoding (<meta charset="utf-8">).');

    // 13. URL Analysis
    const urlIssues: string[] = [];
    try {
      const parsedUrl = new URL(url);
      if (url.length > 100) urlIssues.push('URL exceeds 100 characters in length.');
      if (Array.from(parsedUrl.searchParams.keys()).length > 3) {
        urlIssues.push('URL contains more than 3 query parameters.');
      }
      if (/[A-Z]/.test(parsedUrl.pathname)) {
        urlIssues.push('URL contains uppercase characters in path.');
      }
      if (parsedUrl.pathname.includes('_')) {
        urlIssues.push('URL uses underscores (_) instead of hyphens (-).');
      }
    } catch {
      urlIssues.push('Invalid URL structure.');
    }

    // 14. HTTPS & Mixed Content
    const isHttps = url.toLowerCase().startsWith('https://');
    const mixedContent: string[] = [];
    if (isHttps) {
      $('img[src^="http://"], script[src^="http://"], link[href^="http://"], iframe[src^="http://"]').each((_, el) => {
        const src = $(el).attr('src') || $(el).attr('href');
        if (src && !mixedContent.includes(src)) {
          mixedContent.push(src);
        }
      });
    }

    const page: CrawledPage = {
      url,
      statusCode,
      statusType,
      redirectChain,
      finalUrl,
      contentType,
      loadTimeMs,
      sizeBytes,
      title: {
        text: titleText,
        length: titleLength,
        status: titleStatus,
      },
      metaDescription: {
        text: metaDescText,
        length: metaDescLength,
        status: metaDescStatus,
      },
      h1: {
        text: headings.h1,
        count: headings.h1.length,
        status: h1Status,
      },
      headings,
      images,
      canonical: {
        url: canonicalUrl,
        status: canonicalStatus,
      },
      robotsMeta,
      wordCount,
      textLength,
      textToHtmlRatio,
      isThinContent,
      internalLinks,
      externalLinks,
      incomingInternalLinksCount: 0, // calculated later in linkAnalyzer
      isOrphan: false, // calculated later in linkAnalyzer
      schemaTypes,
      hasStructuredData: schemaTypes.length > 0,
      lang,
      openGraph,
      htmlDoc: {
        hasDoctype,
        hasLang,
        hasViewport,
        charset,
        issues: htmlIssues,
      },
      urlIssues,
      httpsInfo: {
        isHttps,
        mixedContent,
      },
      issuesCount: {
        critical: 0,
        warning: 0,
        info: 0,
      },
    };

    return { page, rawText, discoveredInternalHrefs };
  }
}
