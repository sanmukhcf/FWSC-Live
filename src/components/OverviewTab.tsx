import React from 'react';
import { ShieldCheck, AlertCircle, AlertTriangle, CheckCircle2, FileText, ArrowRight, Layers, ExternalLink, Activity } from 'lucide-react';
import { ScoreGauge } from './ScoreGauge';
import type { AuditResult, Issue } from '../types';

interface OverviewTabProps {
  audit: AuditResult;
  onNavigateTab: (tabId: string) => void;
  onSelectPage: (url: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ audit, onNavigateTab, onSelectPage }) => {
  const { scores, issueCounts, pages, issues } = audit;

  const topCriticalIssues = issues.filter(i => i.severity === 'critical').slice(0, 4);

  const getScoreColor = (val: number) => {
    if (val >= 85) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (val >= 70) return 'text-[#F29627] bg-[#FFF5ED] border-[#F29627]/30';
    if (val >= 50) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Overall Health Score & Core Metrics */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 sm:p-8 shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Main Score Radial Gauge */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 bg-[#FFF5ED]/40 rounded-2xl border border-[#F29627]/20">
            <span className="text-xs font-bold uppercase tracking-wider text-[#F29627] mb-3">
              FWSC SEO Health Score
            </span>
            <ScoreGauge score={scores.overall} status={scores.status} size="lg" />
            <p className="text-xs text-[#666666] text-center mt-3 max-w-xs">
              Calculated from crawler results across technical, content, link, and crawlability rules.
            </p>
          </div>

          {/* Category Scores Grid */}
          <div className="lg:col-span-8 space-y-4">
            <h3 className="font-['Poppins'] font-bold text-lg text-[#000000]">
              Category Breakdown
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Technical */}
              <div
                onClick={() => onNavigateTab('technical')}
                className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5] hover:border-[#F29627] transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-[#555555]">Technical SEO</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border ${getScoreColor(scores.technical)}`}>
                    {scores.technical}%
                  </span>
                </div>
                <div className="w-full h-2 bg-[#E5E5E5] rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-[#F29627] rounded-full" style={{ width: `${scores.technical}%` }} />
                </div>
              </div>

              {/* On-Page */}
              <div
                onClick={() => onNavigateTab('onpage')}
                className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5] hover:border-[#F29627] transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-[#555555]">On-Page SEO</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border ${getScoreColor(scores.onPage)}`}>
                    {scores.onPage}%
                  </span>
                </div>
                <div className="w-full h-2 bg-[#E5E5E5] rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-[#F29627] rounded-full" style={{ width: `${scores.onPage}%` }} />
                </div>
              </div>

              {/* Content Quality */}
              <div
                onClick={() => onNavigateTab('content')}
                className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5] hover:border-[#F29627] transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-[#555555]">Content Quality</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border ${getScoreColor(scores.content)}`}>
                    {scores.content}%
                  </span>
                </div>
                <div className="w-full h-2 bg-[#E5E5E5] rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-[#F29627] rounded-full" style={{ width: `${scores.content}%` }} />
                </div>
              </div>

              {/* Link Structure */}
              <div
                onClick={() => onNavigateTab('links')}
                className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5] hover:border-[#F29627] transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-[#555555]">Link Structure</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border ${getScoreColor(scores.linkStructure)}`}>
                    {scores.linkStructure}%
                  </span>
                </div>
                <div className="w-full h-2 bg-[#E5E5E5] rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-[#F29627] rounded-full" style={{ width: `${scores.linkStructure}%` }} />
                </div>
              </div>

              {/* Crawlability */}
              <div
                onClick={() => onNavigateTab('robots')}
                className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5] hover:border-[#F29627] transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-[#555555]">Crawlability</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border ${getScoreColor(scores.crawlability)}`}>
                    {scores.crawlability}%
                  </span>
                </div>
                <div className="w-full h-2 bg-[#E5E5E5] rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-[#F29627] rounded-full" style={{ width: `${scores.crawlability}%` }} />
                </div>
              </div>

              {/* Quick Summary Pill */}
              <div className="p-4 rounded-xl bg-[#FFF5ED] border border-[#F29627]/20 flex flex-col justify-center">
                <span className="text-xs text-[#777777] font-semibold">Audit Completed</span>
                <span className="text-sm font-bold text-[#000000] mt-0.5">
                  {(audit.durationMs / 1000).toFixed(1)}s Crawl Time
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div
          onClick={() => onNavigateTab('pages')}
          className="p-4 rounded-xl bg-white border border-[#E5E5E5] hover:border-[#F29627] transition-colors cursor-pointer"
        >
          <span className="text-xs font-semibold text-[#666666] block">Pages Crawled</span>
          <span className="text-2xl font-extrabold text-[#000000] font-['Poppins'] mt-1 block">
            {audit.pagesCrawledCount}
          </span>
          <span className="text-[11px] text-[#888888] font-mono">
            {audit.pagesDiscoveredCount} discovered
          </span>
        </div>

        <div
          onClick={() => onNavigateTab('issues')}
          className="p-4 rounded-xl bg-white border border-[#E5E5E5] hover:border-[#F29627] transition-colors cursor-pointer"
        >
          <span className="text-xs font-semibold text-[#666666] block">Total Issues</span>
          <span className="text-2xl font-extrabold text-[#000000] font-['Poppins'] mt-1 block">
            {issueCounts.total}
          </span>
          <span className="text-[11px] text-[#888888]">
            Across all categories
          </span>
        </div>

        <div
          onClick={() => onNavigateTab('issues')}
          className="p-4 rounded-xl bg-red-50/50 border border-red-200 hover:border-red-400 transition-colors cursor-pointer"
        >
          <span className="text-xs font-semibold text-red-700 block">Critical Issues</span>
          <span className="text-2xl font-extrabold text-red-700 font-['Poppins'] mt-1 block">
            {issueCounts.critical}
          </span>
          <span className="text-[11px] text-red-600 font-medium">
            Immediate attention
          </span>
        </div>

        <div
          onClick={() => onNavigateTab('issues')}
          className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 hover:border-amber-400 transition-colors cursor-pointer"
        >
          <span className="text-xs font-semibold text-amber-700 block">Warnings</span>
          <span className="text-2xl font-extrabold text-amber-700 font-['Poppins'] mt-1 block">
            {issueCounts.warning}
          </span>
          <span className="text-[11px] text-amber-600 font-medium">
            Medium impact
          </span>
        </div>

        <div
          onClick={() => onNavigateTab('issues')}
          className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 hover:border-emerald-400 transition-colors cursor-pointer col-span-2 sm:col-span-1"
        >
          <span className="text-xs font-semibold text-emerald-700 block">Passed Checks</span>
          <span className="text-2xl font-extrabold text-emerald-700 font-['Poppins'] mt-1 block">
            {issueCounts.passed}
          </span>
          <span className="text-[11px] text-emerald-600 font-medium">
            Clean validations
          </span>
        </div>
      </div>

      {/* Top Priority Issues to Address */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E5E5E5]">
          <div>
            <h3 className="font-['Poppins'] font-bold text-base text-[#000000]">
              Highest Priority Action Items
            </h3>
            <p className="text-xs text-[#666666]">
              Fixing these critical items will have the largest positive impact on your FWSC SEO Health Score.
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('issues')}
            className="text-xs font-bold text-[#F29627] hover:underline flex items-center gap-1 cursor-pointer"
          >
            View All Issues ({issueCounts.total}) &rarr;
          </button>
        </div>

        {topCriticalIssues.length === 0 ? (
          <div className="p-6 text-center bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600 mb-2" />
            <h4 className="font-bold text-sm">No Critical Issues Detected!</h4>
            <p className="text-xs text-emerald-700 mt-0.5">
              Your website passed all critical SEO rules cleanly. Review warnings for further optimization.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {topCriticalIssues.map((issue) => (
              <div
                key={issue.id}
                className="p-4 rounded-xl border border-red-200 bg-red-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-red-50/60 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-bold uppercase tracking-wider">
                      {issue.category}
                    </span>
                    <span className="font-bold text-sm text-[#000000] font-['Poppins']">
                      {issue.title}
                    </span>
                  </div>
                  <p className="text-xs text-[#555555]">
                    {issue.description}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-bold text-red-700">
                    {issue.affectedPages.length} {issue.affectedPages.length === 1 ? 'page' : 'pages'}
                  </span>
                  <button
                    onClick={() => onNavigateTab('issues')}
                    className="px-3 py-1.5 rounded-lg bg-white border border-[#E5E5E5] text-xs font-bold text-[#000000] hover:border-[#F29627] hover:text-[#F29627] transition-colors cursor-pointer"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
