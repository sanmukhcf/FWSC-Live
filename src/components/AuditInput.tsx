import React, { useState } from 'react';
import { Globe, Settings, ArrowRight, ShieldAlert, Clock, CheckCircle2, AlertTriangle, RotateCcw } from 'lucide-react';
import type { AuditErrorDetails } from '../types';

interface AuditInputProps {
  onStartAudit: (url: string, maxPages: number) => void;
  isLoading: boolean;
  error?: string | null;
  errorDetails?: AuditErrorDetails | null;
  recentWebsites?: string[];
  onSelectRecentWebsite?: (url: string) => void;
}

export const AuditInput: React.FC<AuditInputProps> = ({
  onStartAudit,
  isLoading,
  error,
  errorDetails,
  recentWebsites = [],
  onSelectRecentWebsite,
}) => {
  const [url, setUrl] = useState('');
  const [maxPages, setMaxPages] = useState<number>(50);
  const [showSettings, setShowSettings] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    let trimmed = url.trim();
    if (!trimmed) {
      setLocalError('Please enter a website URL.');
      return;
    }

    if (!/^https?:\/\//i.test(trimmed)) {
      trimmed = 'https://' + trimmed;
    }

    try {
      new URL(trimmed);
      onStartAudit(trimmed, maxPages);
    } catch {
      setLocalError('Please enter a valid URL (e.g., https://yourwebsite.com).');
    }
  };

  const handleRecentClick = (recentUrl: string) => {
    setUrl(recentUrl);
    setLocalError(null);
    if (onSelectRecentWebsite) {
      onSelectRecentWebsite(recentUrl);
    }
  };

  const handleRetryAudit = () => {
    let trimmed = url.trim();
    if (!trimmed && errorDetails?.url) {
      trimmed = errorDetails.url;
      setUrl(trimmed);
    }
    if (!trimmed) return;
    if (!/^https?:\/\//i.test(trimmed)) {
      trimmed = 'https://' + trimmed;
    }
    onStartAudit(trimmed, maxPages);
  };

  return (
    <div className="w-full max-w-4xl mx-auto text-center pt-8 pb-12">
      {/* Brand Tagline Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFF5ED] border border-[#F29627]/30 text-[#F29627] text-xs font-semibold uppercase tracking-wider mb-6 shadow-xs">
        <span className="w-2 h-2 rounded-full bg-[#F29627] animate-pulse"></span>
        Zero Third-Party APIs • 100% Genuine Direct Crawler
      </div>

      {/* Main Headline & Subheading */}
      <h1 className="font-['Poppins'] text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#000000] tracking-tight leading-[1.15] mb-4">
        Analyze Your <span className="text-[#F29627]">Website SEO</span>
      </h1>
      <p className="text-lg sm:text-xl text-[#555555] max-w-2xl mx-auto mb-8 font-normal leading-relaxed">
        Enter your website URL and get a complete technical and on-page SEO audit.
      </p>

      {/* Input Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-[#E5E5E5] shadow-[0_8px_30px_rgba(0,0,0,0.06)] text-left relative">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#888888]">
                <Globe className="w-5 h-5 text-[#F29627]" />
              </div>
              <input
                id="website-url-input"
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setLocalError(null);
                }}
                placeholder="https://yourwebsite.com"
                disabled={isLoading}
                className="w-full pl-12 pr-4 py-4 rounded-xl bg-[#F5F5F5] border border-[#E5E5E5] text-[#000000] text-base placeholder-[#999999] focus:outline-none focus:border-[#F29627] focus:bg-white focus:ring-3 focus:ring-[#F29627]/20 transition-all font-medium disabled:opacity-50"
              />
            </div>

            <button
              id="start-audit-button"
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#F29627] hover:bg-[#FF9235] text-white font-bold text-base transition-all duration-200 shadow-[0_4px_14px_rgba(242,150,39,0.39)] hover:shadow-[0_6px_20px_rgba(242,150,39,0.5)] active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
            >
              <span>{isLoading ? 'Starting Crawl...' : 'Start SEO Audit'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Error Message & Technical Breakdown */}
          {(localError || error || errorDetails) && (
            errorDetails?.type === 'rate_limited' || errorDetails?.statusCode === 429 ? (
              <div id="audit-ratelimit-card" className="bg-amber-50/95 rounded-xl p-4 border border-amber-300 text-left space-y-3">
                <div className="flex items-start gap-2.5 text-sm text-amber-900 font-semibold">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-['Poppins'] font-bold text-amber-950">Website Reachable • Server Rate-Limited (HTTP 429)</span>
                      <span className="font-mono text-[11px] px-2 py-0.5 bg-amber-200/80 text-amber-900 rounded font-bold border border-amber-300">
                        HTTP 429
                      </span>
                    </div>
                    <p className="text-xs text-amber-900 font-normal mt-1 leading-relaxed">
                      {errorDetails?.message || 'The website domain exists and is reachable, but the server temporarily throttled automated crawler requests.'}
                    </p>
                  </div>
                </div>

                {errorDetails?.rateLimitInfo && (
                  <div className="grid grid-cols-3 gap-2 py-1 text-center text-xs">
                    <div className="bg-white/80 border border-amber-200 rounded-lg p-2">
                      <div className="text-[11px] text-amber-700 font-medium">Pages Analyzed</div>
                      <div className="text-sm font-bold text-amber-950">{errorDetails.rateLimitInfo.pagesAnalyzed}</div>
                    </div>
                    <div className="bg-white/80 border border-amber-200 rounded-lg p-2">
                      <div className="text-[11px] text-amber-700 font-medium">Pages Throttled</div>
                      <div className="text-sm font-bold text-amber-950">{errorDetails.rateLimitInfo.pagesRateLimited}</div>
                    </div>
                    <div className="bg-white/80 border border-amber-200 rounded-lg p-2">
                      <div className="text-[11px] text-amber-700 font-medium">Pages Queued</div>
                      <div className="text-sm font-bold text-amber-950">{errorDetails.rateLimitInfo.pagesRemaining}</div>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-amber-800">
                  <span>
                    The target server returned HTTP 429 to protect its capacity. You can wait a moment and try again.
                  </span>
                  <button
                    type="button"
                    onClick={handleRetryAudit}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors shrink-0 shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retry Audit</span>
                  </button>
                </div>
              </div>
            ) : (
              <div id="audit-error-card" className="bg-red-50/90 rounded-xl p-4 border border-red-200 text-left space-y-2">
                <div className="flex items-start gap-2.5 text-sm text-red-700 font-semibold">
                  <ShieldAlert className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>{errorDetails?.errorType || 'Audit Could Not Proceed'}</span>
                      {errorDetails?.reason && (
                        <span className="font-mono text-[11px] px-2 py-0.5 bg-red-100 text-red-800 rounded font-bold border border-red-200">
                          {errorDetails.reason}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-red-700 font-normal mt-1 leading-relaxed">
                      {localError || errorDetails?.message || error}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-red-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-red-600">
                  <span>
                    {errorDetails?.reason === 'NXDOMAIN' || errorDetails?.reason === 'ENOTFOUND' || errorDetails?.type === 'dns_failed'
                      ? 'Website Not Found: Check that the domain name is spelled correctly and has active DNS records.'
                      : errorDetails?.type === 'restricted_ip'
                      ? 'Localhost, private loopback, and internal network addresses cannot be audited.'
                      : errorDetails?.type === 'connection_refused' || errorDetails?.type === 'timeout' || errorDetails?.type === 'unreachable'
                      ? 'Website Could Not Be Reached: The server is offline, unreachable, or refused the connection.'
                      : errorDetails?.type === 'forbidden' || errorDetails?.reason === 'HTTP_403' || errorDetails?.reason === 'HTTP_401'
                      ? 'Website exists, but blocked automated crawlers with HTTP 403 (Access Denied).'
                      : errorDetails?.type === 'not_found' || errorDetails?.reason === 'HTTP_404'
                      ? 'Domain exists, but the requested page returned HTTP 404 (Not Found).'
                      : errorDetails?.type === 'redirect_loop'
                      ? 'The website redirected repeatedly in an infinite circular loop.'
                      : 'FWSC performs genuine live HTTP crawls and never fabricates simulated data for unreachable sites.'}
                  </span>
                  <span className="shrink-0 font-medium text-red-700 bg-red-100/80 px-2 py-0.5 rounded">
                    No simulated report created
                  </span>
                </div>
              </div>
            )
          )}

          {/* Recent Websites Section (User-specific history only, no demo presets) */}
          <div className="pt-1 min-h-[30px] flex items-center">
            {recentWebsites.length === 0 ? (
              <div id="recent-audits-empty" className="flex flex-col sm:flex-row sm:items-center gap-1.5 text-xs text-[#777777]">
                <div className="flex items-center gap-1.5 font-medium text-[#555555]">
                  <Clock className="w-3.5 h-3.5 text-[#F29627]" />
                  <span>No recent audits yet</span>
                </div>
                <span className="hidden sm:inline text-[#D0D0D0]">•</span>
                <span className="text-[11px] text-[#888888]">
                  Your recently audited websites will appear here.
                </span>
              </div>
            ) : (
              <div id="recent-audits-list" className="flex flex-wrap items-center gap-2 text-xs text-[#666666]">
                <div className="flex items-center gap-1.5 font-semibold text-[#222222]">
                  <Clock className="w-3.5 h-3.5 text-[#F29627]" />
                  <span>Recent Websites:</span>
                </div>
                {recentWebsites.slice(0, 5).map((recentUrl) => {
                  const displayUrl = recentUrl.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
                  return (
                    <button
                      key={recentUrl}
                      id={`recent-website-${displayUrl.replace(/[^a-zA-Z0-9]/g, '-')}`}
                      type="button"
                      onClick={() => handleRecentClick(recentUrl)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#F5F5F5] hover:bg-[#FFF5ED] hover:text-[#F29627] hover:border-[#F29627]/40 text-[#444444] border border-[#E5E5E5] transition-colors cursor-pointer font-mono text-[11px] group shadow-2xs"
                      title={`Click to fill ${recentUrl}`}
                    >
                      <Globe className="w-3 h-3 text-[#888888] group-hover:text-[#F29627] transition-colors" />
                      <span className="truncate max-w-[200px]">{displayUrl}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Optional Settings Accordion */}
          <div className="pt-3 border-t border-[#E5E5E5]">
            <button
              type="button"
              id="toggle-settings-btn"
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#444444] hover:text-[#F29627] transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>{showSettings ? 'Hide Crawl Settings' : 'Configure Maximum Pages to Crawl'}</span>
              <span className="text-[#888888]">({maxPages} Pages)</span>
            </button>

            {showSettings && (
              <div className="mt-3 p-4 bg-[#FFF5ED] rounded-xl border border-[#F29627]/20">
                <label className="block text-xs font-bold text-[#000000] uppercase tracking-wider mb-2">
                  Maximum Pages to Crawl
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[10, 50, 100, 500].map((pages) => (
                    <button
                      key={pages}
                      type="button"
                      onClick={() => setMaxPages(pages)}
                      className={`px-3 py-2.5 rounded-lg text-xs font-semibold border transition-all text-center cursor-pointer ${
                        maxPages === pages
                          ? 'bg-[#F29627] text-white border-[#F29627] shadow-xs'
                          : 'bg-white text-[#333333] border-[#E5E5E5] hover:border-[#F29627]/50'
                      }`}
                    >
                      {pages} Pages {pages === 50 && '(Default)'}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-[#777777] mt-2">
                  Controlled concurrency and rate-limiting will be applied dynamically during crawling.
                </p>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Feature Highlights / Genuine SEO rules banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 text-left">
        <div className="bg-white p-4 rounded-xl border border-[#E5E5E5] flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#FFF5ED] text-[#F29627] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-[#000000] font-['Poppins']">Live Dynamic Crawl</h4>
            <p className="text-xs text-[#666666] mt-0.5">
              Traverses internal HTML links, respects robots.txt, and parses XML sitemaps directly.
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E5E5] flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#FFF5ED] text-[#F29627] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-[#000000] font-['Poppins']">25+ Rule Analyses</h4>
            <p className="text-xs text-[#666666] mt-0.5">
              Deep inspection of Titles, Metas, H1-H6, Canonicals, OpenGraph, JSON-LD schemas, and broken links.
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E5E5] flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#FFF5ED] text-[#F29627] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-[#000000] font-['Poppins']">Duplicate Content</h4>
            <p className="text-xs text-[#666666] mt-0.5">
              N-gram shingling & Jaccard similarity algorithms to flag internal near-duplicate pages.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
