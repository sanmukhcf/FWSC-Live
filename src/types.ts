export type IssueSeverity = 'critical' | 'warning' | 'info' | 'passed';
export type IssueCategory = 'Technical' | 'On-Page' | 'Content' | 'Links' | 'Crawlability';

export interface Issue {
  id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  title: string;
  description: string;
  recommendation: string;
  affectedPages: string[];
}

export interface PageHeadingStructure {
  h1: string[];
  h2: string[];
  h3: string[];
  h4: string[];
  h5: string[];
  h6: string[];
  issues: string[];
}

export interface PageImage {
  src: string;
  alt: string;
  missingAlt: boolean;
  emptyAlt: boolean;
}

export interface PageLink {
  href: string;
  text: string;
  isExternal: boolean;
  statusCode?: number;
  isBroken?: boolean;
}

export interface CrawledPage {
  url: string;
  statusCode: number;
  statusType: '2xx' | '3xx' | '4xx' | '5xx' | 'error';
  redirectChain: string[];
  finalUrl: string;
  contentType: string;
  loadTimeMs: number;
  sizeBytes: number;
  title: {
    text: string;
    length: number;
    status: 'ok' | 'missing' | 'too_short' | 'too_long' | 'duplicate';
  };
  metaDescription: {
    text: string;
    length: number;
    status: 'ok' | 'missing' | 'too_short' | 'too_long' | 'duplicate';
  };
  h1: {
    text: string[];
    count: number;
    status: 'ok' | 'missing' | 'multiple' | 'empty';
  };
  headings: PageHeadingStructure;
  images: PageImage[];
  canonical: {
    url: string | null;
    status: 'ok' | 'missing' | 'multiple' | 'cross_domain' | 'mismatch';
  };
  robotsMeta: {
    noindex: boolean;
    nofollow: boolean;
    noarchive: boolean;
    nosnippet: boolean;
    raw: string | null;
  };
  wordCount: number;
  textLength: number;
  textToHtmlRatio: number; // in percentage e.g. 15.5%
  isThinContent: boolean;
  internalLinks: PageLink[];
  externalLinks: PageLink[];
  incomingInternalLinksCount: number;
  isOrphan: boolean;
  schemaTypes: string[];
  hasStructuredData: boolean;
  lang: string | null;
  openGraph: {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    twitterCard?: string;
  };
  htmlDoc: {
    hasDoctype: boolean;
    hasLang: boolean;
    hasViewport: boolean;
    charset?: string;
    issues: string[];
  };
  urlIssues: string[];
  httpsInfo: {
    isHttps: boolean;
    mixedContent: string[];
  };
  issuesCount: {
    critical: number;
    warning: number;
    info: number;
  };
}

export interface DuplicatePair {
  pageA: string;
  pageB: string;
  similarityPercentage: number;
  type: 'exact' | 'near';
}

export interface RobotsAnalysis {
  exists: boolean;
  url: string;
  content: string;
  sitemaps: string[];
  blockedPaths: string[];
  issues: string[];
}

export interface SitemapAnalysis {
  exists: boolean;
  url: string;
  totalUrls: number;
  urls: string[];
  errors: Array<{ url: string; status: number }>;
  redirected: Array<{ url: string; to: string }>;
  unreachableUrls: string[];
}

export interface BrokenLink {
  sourcePage: string;
  targetUrl: string;
  statusCode: number;
  isExternal: boolean;
}

export interface AuditScores {
  overall: number; // 0-100
  status: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical';
  technical: number;
  onPage: number;
  content: number;
  linkStructure: number;
  crawlability: number;
}

export interface AuditResult {
  id: string;
  websiteUrl: string;
  normalizedDomain: string;
  maxPages: number;
  createdAt: string;
  completedAt: string;
  durationMs: number;
  scores: AuditScores;
  pagesCrawledCount: number;
  pagesDiscoveredCount: number;
  issueCounts: {
    total: number;
    critical: number;
    warning: number;
    info: number;
    passed: number;
  };
  pages: CrawledPage[];
  issues: Issue[];
  duplicatePairs: DuplicatePair[];
  robotsAnalysis: RobotsAnalysis;
  sitemapAnalysis: SitemapAnalysis;
  brokenLinks: BrokenLink[];
  externalDomainsCount: number;
  totalExternalLinksCount: number;
}

export interface AuditErrorDetails {
  type:
    | 'invalid_url'
    | 'dns_failed'
    | 'restricted_ip'
    | 'connection_refused'
    | 'timeout'
    | 'unreachable'
    | 'http_error'
    | 'redirect_loop'
    | 'crawl_error';
  errorType: string;
  reason: string;
  message: string;
  url: string;
  statusCode?: number;
}

export interface CrawlProgress {
  statusMessage: string;
  step:
    | 'validating'
    | 'dns'
    | 'connecting'
    | 'redirects'
    | 'robots'
    | 'sitemap'
    | 'crawling'
    | 'analyzing_links'
    | 'analyzing_duplicates'
    | 'calculating_scores'
    | 'completed'
    | 'failed';
  pagesDiscovered: number;
  pagesCrawled: number;
  currentUrl: string;
  percent: number;
  recentLogs: Array<{ time: string; message: string; type?: 'info' | 'success' | 'warn' | 'error' }>;
}

export interface AuditJob {
  id: string;
  url: string;
  maxPages: number;
  status: 'pending' | 'crawling' | 'analyzing' | 'completed' | 'failed';
  progress: CrawlProgress;
  createdAt: string;
  completedAt?: string;
  error?: string;
  errorDetails?: AuditErrorDetails;
  result?: AuditResult;
}

export interface AuditHistoryItem {
  id: string;
  websiteUrl: string;
  createdAt: string;
  pagesCrawled: number;
  score: number;
  scoreStatus: string;
  criticalIssues: number;
  warnings: number;
}
