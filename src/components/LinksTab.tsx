import React from 'react';
import { Link2, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { CrawledPage, BrokenLink } from '../types';

interface LinksTabProps {
  pages: CrawledPage[];
  brokenLinks: BrokenLink[];
  onSelectPage: (url: string) => void;
}

export const LinksTab: React.FC<LinksTabProps> = ({ pages, brokenLinks, onSelectPage }) => {
  // Orphan pages (0 incoming internal links, excluding root)
  const orphanPages = pages.filter((p, idx) => idx > 0 && p.incomingInternalLinksCount === 0);

  // Total internal and external link counts
  let totalInternalLinks = 0;
  let totalExternalLinks = 0;
  pages.forEach(p => {
    totalInternalLinks += p.internalLinks.length;
    totalExternalLinks += p.externalLinks.length;
  });

  return (
    <div className="space-y-6">
      {/* 1. Link Distribution Metrics */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 shadow-xs">
        <h3 className="font-['Poppins'] font-bold text-base text-[#000000] mb-4 flex items-center gap-2">
          <Link2 className="w-4 h-4 text-[#F29627]" />
          <span>Internal & External Link Distribution</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
            <span className="text-xs font-semibold text-[#666666] block">Internal Links</span>
            <span className="text-2xl font-bold font-['Poppins'] text-[#000000] mt-1 block">
              {totalInternalLinks.toLocaleString()}
            </span>
            <span className="text-[11px] text-[#777777]">Site connectivity</span>
          </div>

          <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
            <span className="text-xs font-semibold text-[#666666] block">External Outbound</span>
            <span className="text-2xl font-bold font-['Poppins'] text-[#000000] mt-1 block">
              {totalExternalLinks.toLocaleString()}
            </span>
            <span className="text-[11px] text-[#777777]">Third-party references</span>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200">
            <span className="text-xs font-semibold text-amber-700 block">Orphan Pages</span>
            <span className="text-2xl font-bold font-['Poppins'] text-amber-800 mt-1 block">
              {orphanPages.length}
            </span>
            <span className="text-[11px] text-amber-600">0 incoming internal links</span>
          </div>

          <div className="p-4 rounded-xl bg-red-50/50 border border-red-200">
            <span className="text-xs font-semibold text-red-700 block">Broken Links</span>
            <span className="text-2xl font-bold font-['Poppins'] text-red-800 mt-1 block">
              {brokenLinks.length}
            </span>
            <span className="text-[11px] text-red-600">4xx / 5xx dead links</span>
          </div>
        </div>
      </div>

      {/* 2. Orphan Pages Inspector */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-['Poppins'] font-bold text-base text-[#000000]">
              Orphan Pages Detected
            </h3>
            <p className="text-xs text-[#666666]">
              Pages found in the sitemap or queue that have zero incoming internal links from other crawled pages.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#F5F5F5] text-[#333333]">
            {orphanPages.length} Pages
          </span>
        </div>

        {orphanPages.length === 0 ? (
          <div className="p-6 text-center bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-xs">
            <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-600 mb-1" />
            Great link architecture! All crawled subpages receive incoming internal links.
          </div>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {orphanPages.map((page, i) => (
              <div
                key={i}
                className="p-3 rounded-lg border border-amber-200 bg-amber-50/30 flex items-center justify-between text-xs hover:bg-amber-50/60"
              >
                <span className="font-mono text-[#222222] truncate max-w-xl">{page.url}</span>
                <button
                  onClick={() => onSelectPage(page.url)}
                  className="text-[#F29627] hover:underline font-semibold shrink-0 ml-2"
                >
                  Inspect &rarr;
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Broken Links Report */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-['Poppins'] font-bold text-base text-[#000000]">
              Broken Links Audit
            </h3>
            <p className="text-xs text-[#666666]">
              Dead hyperlinks leading to HTTP 404, 410, or server error responses.
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            brokenLinks.length > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
          }`}>
            {brokenLinks.length} Broken Links
          </span>
        </div>

        {brokenLinks.length === 0 ? (
          <div className="p-6 text-center bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-xs">
            <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-600 mb-1" />
            No broken internal or external links were detected during the audit!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#FAFAFA] border-b border-[#E5E5E5] text-[#444444] font-bold">
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Source Page</th>
                  <th className="py-2.5 px-3">Broken Target Link</th>
                  <th className="py-2.5 px-3 w-24 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {brokenLinks.map((bl, i) => (
                  <tr key={i} className="hover:bg-[#F9F9F9]">
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        !bl.isExternal ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {!bl.isExternal ? 'Internal' : 'External'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#333333] truncate max-w-xs">{bl.sourcePage}</td>
                    <td className="py-2.5 px-3 font-mono text-red-700 font-semibold truncate max-w-xs">{bl.targetUrl}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-mono font-bold">
                        HTTP {bl.statusCode}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
