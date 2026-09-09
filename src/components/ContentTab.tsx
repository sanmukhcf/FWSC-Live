import React from 'react';
import { FileText, Copy, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { CrawledPage, DuplicatePair } from '../types';

interface ContentTabProps {
  pages: CrawledPage[];
  duplicates: DuplicatePair[];
  onSelectPage: (url: string) => void;
}

export const ContentTab: React.FC<ContentTabProps> = ({ pages, duplicates, onSelectPage }) => {
  const thinPages = pages.filter(p => p.isThinContent);
  const lowTextHtmlPages = pages.filter(p => p.textToHtmlRatio < 10);

  const totalWords = pages.reduce((sum, p) => sum + p.wordCount, 0);
  const avgWords = pages.length > 0 ? Math.round(totalWords / pages.length) : 0;

  return (
    <div className="space-y-6">
      {/* 1. Content Depth & Statistics */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 shadow-xs">
        <h3 className="font-['Poppins'] font-bold text-base text-[#000000] mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#F29627]" />
          <span>Content Depth & Volume Analysis</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
            <span className="text-xs font-semibold text-[#666666] block">Average Word Count</span>
            <span className="text-2xl font-bold font-['Poppins'] text-[#000000] mt-1 block">
              {avgWords.toLocaleString()}
            </span>
            <span className="text-[11px] text-[#777777]">Words per page</span>
          </div>

          <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
            <span className="text-xs font-semibold text-[#666666] block">Total Site Words</span>
            <span className="text-2xl font-bold font-['Poppins'] text-[#000000] mt-1 block">
              {totalWords.toLocaleString()}
            </span>
            <span className="text-[11px] text-[#777777]">Across all {pages.length} pages</span>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200">
            <span className="text-xs font-semibold text-amber-700 block">Thin Content Pages</span>
            <span className="text-2xl font-bold font-['Poppins'] text-amber-800 mt-1 block">
              {thinPages.length}
            </span>
            <span className="text-[11px] text-amber-600">Less than 200 words</span>
          </div>

          <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
            <span className="text-xs font-semibold text-[#666666] block">Low Text/HTML Ratio</span>
            <span className="text-2xl font-bold font-['Poppins'] text-[#333333] mt-1 block">
              {lowTextHtmlPages.length}
            </span>
            <span className="text-[11px] text-[#777777]">Under 10% visible text</span>
          </div>
        </div>

        {/* Thin Content Pages List */}
        {thinPages.length > 0 && (
          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800 block">
              Thin Content Detected (&lt; 200 words) ({thinPages.length} pages)
            </span>
            <p className="text-xs text-amber-700">
              Thin pages lack sufficient text for search engines to understand topical intent and rank reliably.
            </p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pt-2">
              {thinPages.map((tp, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs bg-white p-2 rounded border border-amber-200">
                  <span className="font-mono text-[#222222] truncate max-w-lg">{tp.url}</span>
                  <span className="font-bold text-amber-700 shrink-0 ml-2">
                    {tp.wordCount} words
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Internal Duplicate Content Checker */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-[#E5E5E5]">
          <div>
            <div className="flex items-center gap-2">
              <Copy className="w-5 h-5 text-[#F29627]" />
              <h3 className="font-['Poppins'] font-bold text-base text-[#000000]">
                Internal Duplicate Content Checker
              </h3>
            </div>
            <p className="text-xs text-[#666666] mt-0.5">
              Evaluates textual overlap between internal crawled pages using 3-gram shingling & Jaccard similarity algorithms.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FFF5ED] text-[#F29627] border border-[#F29627]/30 self-start sm:self-auto">
            {duplicates.length} Duplicate Pairs
          </span>
        </div>

        <div className="p-3 bg-[#F9F9F9] rounded-xl border border-[#E5E5E5] text-xs text-[#555555] mb-4">
          <span className="font-bold text-[#111111]">Note: </span>
          This analysis performs internal text similarity detection strictly within your own website's pages. It flags potential keyword cannibalization and boilerplate duplication without requiring third-party scraping APIs.
        </div>

        {duplicates.length === 0 ? (
          <div className="p-8 text-center bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 space-y-1">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600 mb-2" />
            <h4 className="font-bold text-sm">No Internal Duplicate Content Found!</h4>
            <p className="text-xs text-emerald-700">
              All analyzed pages have distinct textual content and high uniqueness across your site structure.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {duplicates.map((dup, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-red-200 bg-red-50/30 hover:bg-red-50/50 transition-colors space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    dup.type === 'exact' || dup.similarityPercentage >= 95 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {dup.similarityPercentage}% {dup.type === 'exact' ? 'Exact Duplicate' : 'Near Duplicate'}
                  </span>
                  <span className="text-[11px] text-[#777777] font-mono">
                    Jaccard Similarity
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-white border border-[#E5E5E5] space-y-1">
                    <span className="text-[11px] font-bold text-[#888888] uppercase tracking-wider block">
                      Page A
                    </span>
                    <span className="font-mono text-[#000000] font-medium block truncate">
                      {dup.pageA}
                    </span>
                    <button
                      onClick={() => onSelectPage(dup.pageA)}
                      className="text-[#F29627] hover:underline font-semibold text-[11px]"
                    >
                      Inspect Page A &rarr;
                    </button>
                  </div>

                  <div className="p-3 rounded-lg bg-white border border-[#E5E5E5] space-y-1">
                    <span className="text-[11px] font-bold text-[#888888] uppercase tracking-wider block">
                      Page B
                    </span>
                    <span className="font-mono text-[#000000] font-medium block truncate">
                      {dup.pageB}
                    </span>
                    <button
                      onClick={() => onSelectPage(dup.pageB)}
                      className="text-[#F29627] hover:underline font-semibold text-[11px]"
                    >
                      Inspect Page B &rarr;
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-[#555555]">
                  <span className="font-semibold text-[#111111]">Recommended Action: </span>
                  Consolidate these duplicate pages using a 301 redirect or set a canonical tag pointing to the authoritative version.
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
