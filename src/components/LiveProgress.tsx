import React from 'react';
import { Loader2, Globe, FileText, CheckCircle2, ShieldCheck, Link2, Search } from 'lucide-react';
import type { CrawlProgress } from '../types';

interface LiveProgressProps {
  progress: CrawlProgress;
  targetUrl: string;
  maxPages: number;
  onCancel?: () => void;
}

const STEPS = [
  { id: 'validating', label: 'Discovering URLs', icon: Search },
  { id: 'robots', label: 'Checking robots.txt', icon: ShieldCheck },
  { id: 'sitemap', label: 'Checking sitemap', icon: Globe },
  { id: 'crawling', label: 'Analyzing pages', icon: FileText },
  { id: 'analyzing_links', label: 'Checking links', icon: Link2 },
  { id: 'calculating_scores', label: 'Calculating SEO score', icon: Loader2 },
  { id: 'completed', label: 'Generating report', icon: CheckCircle2 },
];

export const LiveProgress: React.FC<LiveProgressProps> = ({ progress, targetUrl, maxPages, onCancel }) => {
  const getStepIndex = (step: CrawlProgress['step']): number => {
    switch (step) {
      case 'validating': return 0;
      case 'robots': return 1;
      case 'sitemap': return 2;
      case 'crawling': return 3;
      case 'analyzing_links':
      case 'analyzing_duplicates': return 4;
      case 'calculating_scores': return 5;
      case 'completed': return 6;
      default: return 0;
    }
  };

  const currentStepIdx = getStepIndex(progress.step);

  return (
    <div className="w-full max-w-4xl mx-auto py-8">
      {/* Container Card */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 sm:p-8 shadow-[0_10px_35px_rgba(0,0,0,0.06)]">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E5E5E5]">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F29627] animate-ping" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#F29627]">
                Live Crawl Active
              </span>
            </div>
            <h2 className="font-['Poppins'] text-2xl sm:text-3xl font-bold text-[#000000] mt-1">
              Crawling website...
            </h2>
            <p className="text-xs sm:text-sm text-[#666666] mt-0.5 truncate max-w-md font-mono">
              Target: <span className="font-semibold text-[#000000]">{targetUrl}</span> (Limit: {maxPages} pages)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-[#FFF5ED] border border-[#F29627]/30 text-[#F29627] font-bold text-xl text-center">
              {progress.percent}%
            </div>
          </div>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
          <div className="p-4 rounded-xl bg-[#F5F5F5] border border-[#E5E5E5]">
            <span className="text-xs text-[#666666] font-medium block">Pages Discovered</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-[#000000] font-['Poppins']">
              {progress.pagesDiscovered}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#FFF5ED] border border-[#F29627]/20">
            <span className="text-xs text-[#F29627] font-semibold block">Pages Crawled</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-[#000000] font-['Poppins']">
              {progress.pagesCrawled} <span className="text-sm font-normal text-[#666666]">/ {maxPages} max</span>
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#F5F5F5] border border-[#E5E5E5]">
            <span className="text-xs text-[#666666] font-medium block">Crawl Speed</span>
            <span className="text-base sm:text-lg font-bold text-[#000000] font-['Poppins'] flex items-center gap-1 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Rate Limited (Safe)
            </span>
          </div>
        </div>

        {/* Current URL being audited */}
        <div className="mb-6 p-3 rounded-lg bg-[#FAFAFA] border border-[#E5E5E5] flex items-center gap-2 overflow-hidden">
          <Globe className="w-4 h-4 text-[#F29627] shrink-0" />
          <div className="text-xs text-[#444444] truncate">
            <span className="font-semibold text-[#111111]">Current URL: </span>
            <span className="font-mono text-[#F29627]">{progress.currentUrl || targetUrl}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-xs font-semibold text-[#555555] mb-2">
            <span>Status: {progress.statusMessage}</span>
            <span>{progress.percent}%</span>
          </div>
          <div className="w-full h-3 bg-[#E5E5E5] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#F29627] to-[#FF9235] transition-all duration-300 rounded-full"
              style={{ width: `${Math.max(5, progress.percent)}%` }}
            />
          </div>
        </div>

        {/* SEO Pipeline Stepper */}
        <div className="mb-8">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#333333] mb-3">
            SEO Analysis Pipeline
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {STEPS.map((step, idx) => {
              const isPast = idx < currentStepIdx;
              const isCurrent = idx === currentStepIdx;
              const isFuture = idx > currentStepIdx;

              return (
                <div
                  key={step.id}
                  className={`p-2.5 rounded-lg border text-center transition-all ${
                    isCurrent
                      ? 'bg-[#FFF5ED] border-[#F29627] text-[#000000] shadow-xs'
                      : isPast
                      ? 'bg-white border-[#E5E5E5] text-[#222222]'
                      : 'bg-[#F9F9F9] border-[#EAEAEA] text-[#999999] opacity-60'
                  }`}
                >
                  <div className="flex justify-center mb-1">
                    {isCurrent ? (
                      <Loader2 className="w-4 h-4 text-[#F29627] animate-spin" />
                    ) : isPast ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-current text-[10px] flex items-center justify-center font-bold">
                        {idx + 1}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold leading-tight block truncate">
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Real-time Crawl Log Terminal */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#333333]">
              Live Activity Stream
            </h4>
            <span className="text-[11px] text-[#777777] font-mono">Real-time HTTP requests</span>
          </div>
          <div className="bg-[#111111] rounded-xl p-3 sm:p-4 text-white font-mono text-xs max-h-48 overflow-y-auto space-y-1.5 border border-[#333333]">
            {progress.recentLogs && progress.recentLogs.length > 0 ? (
              progress.recentLogs.map((log, index) => (
                <div key={index} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-[#888888] shrink-0">[{log.time}]</span>
                  <span
                    className={
                      log.type === 'error'
                        ? 'text-red-400'
                        : log.type === 'warn'
                        ? 'text-amber-400'
                        : log.type === 'success'
                        ? 'text-emerald-400'
                        : 'text-zinc-300'
                    }
                  >
                    {log.message}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-[#777777]">Waiting for initial crawler events...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
