import type {
  CrawledPage,
  Issue,
  RobotsAnalysis,
  SitemapAnalysis,
  DuplicatePair,
  BrokenLink,
} from '../../src/types';

export class RulesEngine {
  static evaluateRules(
    pages: CrawledPage[],
    robotsAnalysis: RobotsAnalysis,
    sitemapAnalysis: SitemapAnalysis,
    duplicatePairs: DuplicatePair[],
    brokenLinks: BrokenLink[]
  ): { issues: Issue[]; pagesWithCounts: CrawledPage[] } {
    const issues: Issue[] = [];

    // Helper to register issues
    const addIssue = (
      id: string,
      category: 'Technical' | 'On-Page' | 'Content' | 'Links' | 'Crawlability',
      severity: 'critical' | 'warning' | 'info' | 'passed',
      title: string,
      description: string,
      recommendation: string,
      affectedPages: string[] = []
    ) => {
      issues.push({
        id,
        category,
        severity,
        title,
        description,
        recommendation,
        affectedPages,
      });
    };

    // -------------------------------------------------------------
    // 1. TECHNICAL SEO
    // -------------------------------------------------------------

    // 1.1 HTTP 4xx / 5xx Errors
    const serverErrorPages = pages.filter(p => p.statusCode >= 500).map(p => p.url);
    if (serverErrorPages.length > 0) {
      addIssue(
        'http-5xx-errors',
        'Technical',
        'critical',
        'Server Error Responses (5xx)',
        `${serverErrorPages.length} crawled page(s) returned 5xx server errors, preventing users and search engines from accessing content.`,
        'Inspect server application error logs, fix backend exceptions, and ensure web server stability.',
        serverErrorPages
      );
    }

    const notFoundPages = pages.filter(p => p.statusCode === 404 || p.statusCode === 410).map(p => p.url);
    if (notFoundPages.length > 0) {
      addIssue(
        'http-404-errors',
        'Technical',
        'critical',
        'Page Not Found (404/410)',
        `${notFoundPages.length} crawled URL(s) returned 404 or 410 HTTP status codes.`,
        'Update or remove internal links pointing to dead pages, or implement 301 redirects to relevant live pages.',
        notFoundPages
      );
    }

    const other4xxPages = pages.filter(p => p.statusCode >= 400 && p.statusCode < 500 && p.statusCode !== 404 && p.statusCode !== 410).map(p => p.url);
    if (other4xxPages.length > 0) {
      addIssue(
        'http-4xx-errors',
        'Technical',
        'warning',
        'Client Error Responses (4xx)',
        `${other4xxPages.length} crawled URL(s) returned 4xx client errors (e.g. 401 Unauthorized, 403 Forbidden).`,
        'Verify permissions and remove or update internal links pointing to restricted pages.',
        other4xxPages
      );
    }

    const connectionFailurePages = pages.filter(p => p.statusCode === 0 || p.statusType === 'error').map(p => p.url);
    if (connectionFailurePages.length > 0) {
      addIssue(
        'connection-failure-pages',
        'Technical',
        'critical',
        'Connection / Network Failures During Crawl',
        `${connectionFailurePages.length} page(s) encountered network timeouts or connection failures.`,
        'Investigate web server capacity, rate limiting firewalls, and network reliability.',
        connectionFailurePages
      );
    }

    if (serverErrorPages.length === 0 && notFoundPages.length === 0 && other4xxPages.length === 0 && connectionFailurePages.length === 0 && pages.length > 0) {
      addIssue(
        'passed-http-status',
        'Technical',
        'passed',
        'All Crawled Pages Returned Valid Status',
        'No 4xx, 5xx, or network errors were detected among crawled pages.',
        'Continue monitoring server logs and internal links regularly.',
        []
      );
    }

    // 1.2 Redirect Chains & Loops
    const redirectChainPages = pages.filter(p => p.redirectChain && p.redirectChain.length > 1).map(p => p.url);
    if (redirectChainPages.length > 0) {
      addIssue(
        'redirect-chains',
        'Technical',
        'warning',
        'Redirect Chains Detected',
        `${redirectChainPages.length} URL(s) undergo more than one consecutive redirect before reaching the destination page.`,
        'Update links to point directly to the final destination URL to preserve crawl budget and reduce latency.',
        redirectChainPages
      );
    }

    // 1.3 HTTPS & Mixed Content
    const nonHttpsPages = pages.filter(p => !p.httpsInfo.isHttps).map(p => p.url);
    if (nonHttpsPages.length > 0) {
      addIssue(
        'non-https-pages',
        'Technical',
        'critical',
        'Unencrypted HTTP Protocol in Use',
        `${nonHttpsPages.length} page(s) are served over insecure HTTP instead of HTTPS.`,
        'Install an SSL/TLS certificate and configure permanent 301 redirects from HTTP to HTTPS for all traffic.',
        nonHttpsPages
      );
    } else {
      addIssue(
        'passed-https',
        'Technical',
        'passed',
        'All Pages Use Secure HTTPS',
        'All crawled pages are securely delivered over HTTPS protocol.',
        'Ensure SSL/TLS certificates are set to auto-renew.',
        []
      );
    }

    const mixedContentPages = pages.filter(p => p.httpsInfo.mixedContent.length > 0).map(p => p.url);
    if (mixedContentPages.length > 0) {
      addIssue(
        'mixed-content',
        'Technical',
        'warning',
        'Mixed Content Detected',
        `${mixedContentPages.length} HTTPS page(s) load insecure HTTP assets (scripts, images, or stylesheets).`,
        'Update all asset URLs in HTML and CSS templates to use HTTPS or protocol-relative paths.',
        mixedContentPages
      );
    }

    // 1.4 Canonical Tag Analysis
    const missingCanonicalPages = pages.filter(p => p.canonical.status === 'missing').map(p => p.url);
    if (missingCanonicalPages.length > 0) {
      addIssue(
        'missing-canonical',
        'Technical',
        'warning',
        'Missing Rel="Canonical" Tag',
        `${missingCanonicalPages.length} page(s) do not specify a canonical URL tag in their <head>.`,
        'Add a self-referential or target canonical link tag (<link rel="canonical" href="...">) to prevent duplicate content issues.',
        missingCanonicalPages
      );
    }

    const multipleCanonicalPages = pages.filter(p => p.canonical.status === 'multiple').map(p => p.url);
    if (multipleCanonicalPages.length > 0) {
      addIssue(
        'multiple-canonicals',
        'Technical',
        'critical',
        'Multiple Canonical Tags on Single Page',
        `${multipleCanonicalPages.length} page(s) contain multiple canonical tags, causing search engines to ignore all of them.`,
        'Ensure only one unambiguous canonical tag exists per document.',
        multipleCanonicalPages
      );
    }

    // 1.5 HTML Document Structure
    const missingDoctypePages = pages.filter(p => !p.htmlDoc.hasDoctype).map(p => p.url);
    if (missingDoctypePages.length > 0) {
      addIssue(
        'missing-doctype',
        'Technical',
        'warning',
        'Missing <!DOCTYPE html> Declaration',
        `${missingDoctypePages.length} page(s) do not declare <!DOCTYPE html>, triggering browser quirks mode.`,
        'Add <!DOCTYPE html> as the very first line of every HTML document.',
        missingDoctypePages
      );
    }

    const missingViewportPages = pages.filter(p => !p.htmlDoc.hasViewport).map(p => p.url);
    if (missingViewportPages.length > 0) {
      addIssue(
        'missing-viewport',
        'Technical',
        'critical',
        'Missing Mobile Viewport Meta Tag',
        `${missingViewportPages.length} page(s) are missing <meta name="viewport">, failing mobile-friendliness checks.`,
        'Add <meta name="viewport" content="width=device-width, initial-scale=1.0"> inside <head>.',
        missingViewportPages
      );
    }

    // -------------------------------------------------------------
    // 2. ON-PAGE SEO
    // -------------------------------------------------------------

    // 2.1 Title Tags
    const missingTitlePages = pages.filter(p => p.title.status === 'missing').map(p => p.url);
    if (missingTitlePages.length > 0) {
      addIssue(
        'missing-title',
        'On-Page',
        'critical',
        'Missing or Empty Title Tag',
        `${missingTitlePages.length} page(s) lack a <title> tag in the document head.`,
        'Add an informative, unique <title> tag to every page describing its topic.',
        missingTitlePages
      );
    }

    const shortTitlePages = pages.filter(p => p.title.status === 'too_short').map(p => p.url);
    if (shortTitlePages.length > 0) {
      addIssue(
        'short-title',
        'On-Page',
        'warning',
        'Title Tag Too Short (< 30 characters)',
        `${shortTitlePages.length} page(s) have titles under 30 characters, missing keyword opportunities.`,
        'Expand title tags to between 30 and 60 characters with descriptive primary keywords and brand name.',
        shortTitlePages
      );
    }

    const longTitlePages = pages.filter(p => p.title.status === 'too_long').map(p => p.url);
    if (longTitlePages.length > 0) {
      addIssue(
        'long-title',
        'On-Page',
        'info',
        'Title Tag Too Long (> 60 characters)',
        `${longTitlePages.length} page(s) exceed 60 characters and may be truncated in search engine results.`,
        'Keep page titles concise (under 60 characters or ~600px pixel width) so they display completely in SERPs.',
        longTitlePages
      );
    }

    // Duplicate titles
    const titleBuckets = new Map<string, string[]>();
    for (const p of pages) {
      if (p.title.text && p.title.status !== 'missing') {
        const t = p.title.text.toLowerCase();
        if (!titleBuckets.has(t)) titleBuckets.set(t, []);
        titleBuckets.get(t)!.push(p.url);
      }
    }
    const duplicateTitlesList: string[] = [];
    for (const [_, urls] of titleBuckets.entries()) {
      if (urls.length > 1) {
        duplicateTitlesList.push(...urls);
      }
    }
    if (duplicateTitlesList.length > 0) {
      addIssue(
        'duplicate-titles',
        'On-Page',
        'critical',
        'Duplicate Title Tags',
        `${duplicateTitlesList.length} page(s) share identical title tags, causing keyword cannibalization and confusion for search bots.`,
        'Assign a unique, topic-specific title to each individual page.',
        duplicateTitlesList
      );
    }

    // 2.2 Meta Descriptions
    const missingDescPages = pages.filter(p => p.metaDescription.status === 'missing').map(p => p.url);
    if (missingDescPages.length > 0) {
      addIssue(
        'missing-meta-desc',
        'On-Page',
        'warning',
        'Missing Meta Description',
        `${missingDescPages.length} page(s) do not define a meta description tag.`,
        'Add compelling meta descriptions (120-155 characters) summarizing the page and enticing search clicks.',
        missingDescPages
      );
    }

    const shortDescPages = pages.filter(p => p.metaDescription.status === 'too_short').map(p => p.url);
    if (shortDescPages.length > 0) {
      addIssue(
        'short-meta-desc',
        'On-Page',
        'info',
        'Meta Description Too Short (< 70 characters)',
        `${shortDescPages.length} page(s) have descriptions under 70 characters.`,
        'Expand meta descriptions to between 70 and 160 characters for richer search snippets.',
        shortDescPages
      );
    }

    // Duplicate meta descriptions
    const descBuckets = new Map<string, string[]>();
    for (const p of pages) {
      if (p.metaDescription.text && p.metaDescription.status !== 'missing') {
        const d = p.metaDescription.text.toLowerCase();
        if (!descBuckets.has(d)) descBuckets.set(d, []);
        descBuckets.get(d)!.push(p.url);
      }
    }
    const duplicateDescList: string[] = [];
    for (const [_, urls] of descBuckets.entries()) {
      if (urls.length > 1) duplicateDescList.push(...urls);
    }
    if (duplicateDescList.length > 0) {
      addIssue(
        'duplicate-meta-desc',
        'On-Page',
        'warning',
        'Duplicate Meta Descriptions',
        `${duplicateDescList.length} page(s) share identical meta descriptions.`,
        'Write unique meta descriptions tailored to each specific page content.',
        duplicateDescList
      );
    }

    // 2.3 H1 Headings
    const missingH1Pages = pages.filter(p => p.h1.status === 'missing' || p.h1.status === 'empty').map(p => p.url);
    if (missingH1Pages.length > 0) {
      addIssue(
        'missing-h1',
        'On-Page',
        'critical',
        'Missing H1 Heading',
        `${missingH1Pages.length} page(s) do not contain a primary <h1> heading tag.`,
        'Ensure each page has exactly one prominent <h1> tag communicating the page theme.',
        missingH1Pages
      );
    }

    const multipleH1Pages = pages.filter(p => p.h1.status === 'multiple').map(p => p.url);
    if (multipleH1Pages.length > 0) {
      addIssue(
        'multiple-h1',
        'On-Page',
        'warning',
        'Multiple H1 Headings on Single Page',
        `${multipleH1Pages.length} page(s) have more than one <h1> heading.`,
        'Reserve <h1> for the primary page title and use <h2> through <h6> for subheadings.',
        multipleH1Pages
      );
    }

    // Heading hierarchy issues (e.g. H1 followed by H3 or H4)
    const hierarchyIssuePages = pages.filter(p => p.headings.issues.length > 0).map(p => p.url);
    if (hierarchyIssuePages.length > 0) {
      addIssue(
        'heading-hierarchy-skipped',
        'On-Page',
        'info',
        'Heading Hierarchy Levels Skipped',
        `${hierarchyIssuePages.length} page(s) skip heading levels (e.g., an H1 directly followed by an H4 without intermediate H2/H3).`,
        'Organize headings logically in sequential order (H1 -> H2 -> H3) for accessibility and crawl structure.',
        hierarchyIssuePages
      );
    }

    // 2.4 Image Alt Attributes
    const pagesWithMissingAlt = pages.filter(p => p.images.some(img => img.missingAlt || img.emptyAlt)).map(p => p.url);
    if (pagesWithMissingAlt.length > 0) {
      const totalBadImgs = pages.reduce((acc, p) => acc + p.images.filter(i => i.missingAlt || i.emptyAlt).length, 0);
      addIssue(
        'images-missing-alt',
        'On-Page',
        'warning',
        'Images Missing Descriptive Alt Attribute',
        `${totalBadImgs} image(s) across ${pagesWithMissingAlt.length} page(s) are missing descriptive alt text.`,
        'Add meaningful, descriptive alt text to images for image SEO and screen reader accessibility.',
        pagesWithMissingAlt
      );
    } else if (pages.some(p => p.images.length > 0)) {
      addIssue(
        'passed-image-alt',
        'On-Page',
        'passed',
        'All Discovered Images Have Alt Text',
        'Every image found on crawled pages contains an alt attribute.',
        'Keep maintaining alt attributes for all new media uploaded.',
        []
      );
    }

    // 2.5 HTML Language
    const missingLangPages = pages.filter(p => !p.lang).map(p => p.url);
    if (missingLangPages.length > 0) {
      addIssue(
        'missing-html-lang',
        'On-Page',
        'warning',
        'Missing HTML "lang" Attribute',
        `${missingLangPages.length} page(s) lack a language attribute on the <html> tag.`,
        'Specify the primary language, e.g., <html lang="en">, to aid search engines and screen readers.',
        missingLangPages
      );
    }

    // 2.6 Open Graph & Social Cards
    const missingOgPages = pages.filter(p => !p.openGraph.title || !p.openGraph.image).map(p => p.url);
    if (missingOgPages.length > 0) {
      addIssue(
        'missing-open-graph',
        'On-Page',
        'info',
        'Missing Open Graph Metadata',
        `${missingOgPages.length} page(s) lack complete Open Graph tags (og:title or og:image).`,
        'Add og:title, og:description, and og:image tags for rich preview rendering on social platforms.',
        missingOgPages
      );
    }

    // 2.7 Structured Data
    const pagesWithoutSchema = pages.filter(p => !p.hasStructuredData).map(p => p.url);
    if (pagesWithoutSchema.length > 0) {
      addIssue(
        'missing-structured-data',
        'On-Page',
        'info',
        'No Structured Data (Schema.org / JSON-LD) Detected',
        `${pagesWithoutSchema.length} page(s) do not include JSON-LD or Microdata schema markup.`,
        'Implement Schema.org JSON-LD markup (such as WebSite, Organization, Article, or Product) to qualify for rich snippets in Google SERPs.',
        pagesWithoutSchema
      );
    }

    // -------------------------------------------------------------
    // 3. CONTENT QUALITY
    // -------------------------------------------------------------

    // 3.1 Thin Content
    const thinContentPages = pages.filter(p => p.isThinContent).map(p => p.url);
    if (thinContentPages.length > 0) {
      addIssue(
        'thin-content',
        'Content',
        'warning',
        'Thin Content (< 200 words)',
        `${thinContentPages.length} page(s) have fewer than 200 words of visible text.`,
        'Enrich page copy with detailed, high-value content relevant to user search intent.',
        thinContentPages
      );
    }

    // 3.2 Low Text-to-HTML Ratio
    const lowRatioPages = pages.filter(p => p.textToHtmlRatio < 8 && p.wordCount > 0).map(p => p.url);
    if (lowRatioPages.length > 0) {
      addIssue(
        'low-text-ratio',
        'Content',
        'info',
        'Low Text-to-HTML Ratio (< 8%)',
        `${lowRatioPages.length} page(s) have an excessive ratio of code markup to actual visible readable content.`,
        'Streamline inline CSS/JS and expand primary textual copy.',
        lowRatioPages
      );
    }

    // 3.3 Internal Duplicate Content
    if (duplicatePairs.length > 0) {
      const exactPairs = duplicatePairs.filter(d => d.type === 'exact');
      const nearPairs = duplicatePairs.filter(d => d.type === 'near');

      if (exactPairs.length > 0) {
        const exactUrls = Array.from(new Set(exactPairs.flatMap(p => [p.pageA, p.pageB])));
        addIssue(
          'exact-duplicate-content',
          'Content',
          'critical',
          'Exact Internal Duplicate Content Detected',
          `${exactPairs.length} pair(s) of pages have identical textual content (100% hash/shingle match).`,
          'Consolidate duplicate pages, set canonical tags to the master page, or remove redundant duplicate URLs.',
          exactUrls
        );
      }

      if (nearPairs.length > 0) {
        const nearUrls = Array.from(new Set(nearPairs.flatMap(p => [p.pageA, p.pageB])));
        addIssue(
          'near-duplicate-content',
          'Content',
          'warning',
          'Near-Duplicate Content Detected (> 70% Similarity)',
          `${nearPairs.length} pair(s) of pages exhibit high textual similarity based on n-gram shingling analysis.`,
          'Differentiate page content or utilize canonical tags pointing to the authoritative version.',
          nearUrls
        );
      }
    } else if (pages.length > 1) {
      addIssue(
        'passed-duplicate-content',
        'Content',
        'passed',
        'No Significant Internal Duplicate Content',
        'All crawled pages provide unique internal textual content without duplicate overlap.',
        'Maintain unique copy as new sections are published.',
        []
      );
    }

    // -------------------------------------------------------------
    // 4. LINK STRUCTURE
    // -------------------------------------------------------------

    // 4.1 Broken Links
    const brokenInternal = brokenLinks.filter(b => !b.isExternal);
    if (brokenInternal.length > 0) {
      const affectedSources = Array.from(new Set(brokenInternal.map(b => b.sourcePage)));
      addIssue(
        'broken-internal-links',
        'Links',
        'critical',
        'Broken Internal Links Detected',
        `${brokenInternal.length} internal link(s) return 4xx or 5xx HTTP error codes.`,
        'Fix target URLs or remove links pointing to broken pages to prevent lost link equity.',
        affectedSources
      );
    } else {
      addIssue(
        'passed-broken-links',
        'Links',
        'passed',
        'Zero Broken Internal Links Found',
        'All internal links tested across crawled pages resolved successfully.',
        'Periodically re-crawl to catch any newly created broken URLs.',
        []
      );
    }

    const brokenExternal = brokenLinks.filter(b => b.isExternal);
    if (brokenExternal.length > 0) {
      const affectedSources = Array.from(new Set(brokenExternal.map(b => b.sourcePage)));
      addIssue(
        'broken-external-links',
        'Links',
        'warning',
        'Broken Outbound External Links',
        `${brokenExternal.length} external outbound link(s) failed or returned error codes.`,
        'Update or remove external links pointing to offline external sites.',
        affectedSources
      );
    }

    // 4.2 Orphan Pages
    const orphanPages = pages.filter(p => p.isOrphan).map(p => p.url);
    if (orphanPages.length > 0) {
      addIssue(
        'orphan-pages',
        'Links',
        'warning',
        'Orphan Pages (0 Incoming Internal Links)',
        `${orphanPages.length} discovered page(s) have zero incoming internal links from other crawled pages on your website.`,
        'Add contextual links in main navigation, category pages, or relevant articles pointing to these orphan pages.',
        orphanPages
      );
    }

    // -------------------------------------------------------------
    // 5. CRAWLABILITY & SITEMAP
    // -------------------------------------------------------------

    // 5.1 Robots.txt
    if (!robotsAnalysis.exists) {
      addIssue(
        'missing-robots-txt',
        'Crawlability',
        'warning',
        'robots.txt File Missing (404)',
        'The website does not provide a robots.txt file at /robots.txt.',
        'Create a robots.txt file to guide search engine crawlers and declare sitemap locations.',
        [robotsAnalysis.url]
      );
    } else {
      if (robotsAnalysis.blockedPaths.includes('/')) {
        addIssue(
          'robots-disallow-all',
          'Crawlability',
          'critical',
          'robots.txt Disallowing Entire Website',
          'robots.txt contains "Disallow: /", instructing search engines not to crawl the entire website.',
          'Remove or modify "Disallow: /" in robots.txt so search engines can index public content.',
          [robotsAnalysis.url]
        );
      } else {
        addIssue(
          'passed-robots-txt',
          'Crawlability',
          'passed',
          'robots.txt Valid and Accessible',
          `robots.txt is live, accessible, and declares ${robotsAnalysis.sitemaps.length} sitemap(s).`,
          'Continue reviewing robots.txt when adding new private areas.',
          [robotsAnalysis.url]
        );
      }
    }

    // 5.2 XML Sitemap
    if (!sitemapAnalysis.exists || sitemapAnalysis.totalUrls === 0) {
      addIssue(
        'missing-sitemap',
        'Crawlability',
        'warning',
        'XML Sitemap Not Found',
        'No valid XML sitemap was discovered in robots.txt or standard paths (/sitemap.xml).',
        'Generate and submit an XML sitemap to Google Search Console to aid discovery of deep URLs.',
        []
      );
    } else {
      addIssue(
        'passed-sitemap',
        'Crawlability',
        'passed',
        'XML Sitemap Discovered',
        `Discovered valid XML sitemap containing ${sitemapAnalysis.totalUrls} indexed URLs.`,
        'Keep sitemap updated automatically via your CMS or build pipeline.',
        [sitemapAnalysis.url]
      );
    }

    // 5.3 Robots Meta Noindex
    const noindexPages = pages.filter(p => p.robotsMeta.noindex).map(p => p.url);
    if (noindexPages.length > 0) {
      addIssue(
        'meta-noindex-detected',
        'Crawlability',
        'info',
        'Pages With "noindex" Robots Directive',
        `${noindexPages.length} page(s) contain a "noindex" meta tag, instructing search engines not to index them.`,
        'Verify that pages with noindex are intentionally excluded (e.g. thank you pages, search results).',
        noindexPages
      );
    }

    // Calculate per-page issues count
    const pagesWithCounts = pages.map(page => {
      let critical = 0;
      let warning = 0;
      let info = 0;

      for (const iss of issues) {
        if (iss.affectedPages.includes(page.url)) {
          if (iss.severity === 'critical') critical++;
          else if (iss.severity === 'warning') warning++;
          else if (iss.severity === 'info') info++;
        }
      }

      return {
        ...page,
        issuesCount: { critical, warning, info },
      };
    });

    return { issues, pagesWithCounts };
  }
}
