import React, { useState } from 'react';
import { Search, ExternalLink, AlertCircle, AlertTriangle, ArrowUpDown } from 'lucide-react';
import type { CrawledPage } from '../types';

interface PageExplorerProps {
  pages: CrawledPage[];
  onSelectPage: (page: CrawledPage) => void;
}

export const PageExplorer: React.FC<PageExplorerProps> = ({ pages, onSelectPage }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | '2xx' | '3xx' | '4xx' | '5xx' | 'error'>('all');
  const [indexFilter, setIndexFilter] = useState<'all' | 'indexable' | 'noindex'>('all');
  const [sortBy, setSortBy] = useState<'url' | 'status' | 'wordCount' | 'issues'>('issues');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredPages = pages.filter(p => {
    if (statusFilter !== 'all' && p.statusType !== statusFilter) return false;
    if (indexFilter === 'indexable' && p.robotsMeta.noindex) return false;
    if (indexFilter === 'noindex' && !p.robotsMeta.noindex) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.url.toLowerCase().includes(q) ||
        p.title.text.toLowerCase().includes(q) ||
        (p.h1.text[0] || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  filteredPages.sort((a, b) => {
    let comp = 0;
    if (sortBy === 'url') comp = a.url.localeCompare(b.url);
    else if (sortBy === 'status') comp = a.statusCode - b.statusCode;
    else if (sortBy === 'wordCount') comp = a.wordCount - b.wordCount;
    else if (sortBy === 'issues') {
      const issuesA = a.issuesCount.critical * 3 + a.issuesCount.warning;
      const issuesB = b.issuesCount.critical * 3 + b.issuesCount.warning;
      comp = issuesA - issuesB;
    }
    return sortOrder === 'asc' ? comp : -comp;
  });

  const getStatusBadge = (code: number) => {
    if (code >= 200 && code < 300) {
      return <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold font-mono text-xs">{code} OK</span>;
    }
    if (code >= 300 && code < 400) {
      return <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold font-mono text-xs">{code} Redirect</span>;
    }
    if (code >= 400 && code < 500) {
      return <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 font-bold font-mono text-xs">{code} Error</span>;
    }
    if (code >= 500) {
      return <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold font-mono text-xs">{code} Server Err</span>;
    }
    return <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 font-bold font-mono text-xs">Failed</span>;
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden shadow-xs">
      {/* Top Filter and Search Bar */}
      <div className="p-4 sm:p-6 border-b border-[#E5E5E5] space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(['all', '2xx', '3xx', '4xx', '5xx'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  statusFilter === st
                    ? 'bg-[#000000] text-white'
                    : 'bg-[#F5F5F5] text-[#555555] hover:bg-[#E5E5E5]'
                }`}
              >
                {st === 'all' ? `All Pages (${pages.length})` : `${st.toUpperCase()}`}
              </button>
            ))}
            <span className="text-[#CCCCCC] mx-1">|</span>
            {(['all', 'indexable', 'noindex'] as const).map(ind => (
              <button
                key={ind}
                onClick={() => setIndexFilter(ind)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                  indexFilter === ind
                    ? 'bg-[#F29627] text-white'
                    : 'bg-[#F5F5F5] text-[#555555] hover:bg-[#FFF5ED]'
                }`}
              >
                {ind === 'all' ? 'All Indexability' : ind === 'indexable' ? 'Indexable' : 'Noindex'}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-[#888888] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by URL, Title, or H1..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#F5F5F5] border border-[#E5E5E5] text-xs text-[#000000] placeholder-[#888888] focus:outline-none focus:border-[#F29627] focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Pages Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#FAFAFA] border-b border-[#E5E5E5] text-[#444444] font-bold uppercase tracking-wider">
              <th className="py-3 px-4 min-w-[220px]">URL & Status</th>
              <th className="py-3 px-4 min-w-[180px]">Title</th>
              <th className="py-3 px-4 min-w-[140px]">H1 Heading</th>
              <th className="py-3 px-4 w-24 text-center">
                <button
                  onClick={() => {
                    if (sortBy === 'wordCount') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    else { setSortBy('wordCount'); setSortOrder('desc'); }
                  }}
                  className="inline-flex items-center gap-1 font-bold hover:text-[#F29627]"
                >
                  Words <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-3 px-4 w-24 text-center">Canonical</th>
              <th className="py-3 px-4 w-24 text-center">Indexable</th>
              <th className="py-3 px-4 w-28 text-center">Links (In / Out)</th>
              <th className="py-3 px-4 w-24 text-center">
                <button
                  onClick={() => {
                    if (sortBy === 'issues') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    else { setSortBy('issues'); setSortOrder('desc'); }
                  }}
                  className="inline-flex items-center gap-1 font-bold hover:text-[#F29627]"
                >
                  Issues <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-3 px-4 w-16 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E5E5]">
            {filteredPages.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-[#777777]">
                  No crawled pages found matching your filters.
                </td>
              </tr>
            ) : (
              filteredPages.map((page, idx) => {
                const totalIssues = page.issuesCount.critical + page.issuesCount.warning + page.issuesCount.info;
                return (
                  <tr
                    key={idx}
                    onClick={() => onSelectPage(page)}
                    className="hover:bg-[#FFFDFB] cursor-pointer transition-colors group"
                  >
                    {/* URL & Status Code */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusBadge(page.statusCode)}
                        <span className="text-[10px] text-[#888888] font-mono">
                          {page.loadTimeMs}ms
                        </span>
                      </div>
                      <span className="font-mono text-[#000000] font-medium block truncate max-w-xs sm:max-w-sm group-hover:text-[#F29627] transition-colors">
                        {page.url}
                      </span>
                    </td>

                    {/* Title */}
                    <td className="py-3 px-4">
                      {page.title.text ? (
                        <div>
                          <span className="font-semibold text-[#111111] line-clamp-1 block">
                            {page.title.text}
                          </span>
                          <span className="text-[10px] text-[#777777]">
                            {page.title.length} chars
                          </span>
                        </div>
                      ) : (
                        <span className="text-red-500 italic font-semibold">Missing Title</span>
                      )}
                    </td>

                    {/* H1 */}
                    <td className="py-3 px-4">
                      {page.h1.text.length > 0 ? (
                        <span className="text-[#333333] line-clamp-1 block">
                          {page.h1.text[0]}
                        </span>
                      ) : (
                        <span className="text-red-500 italic">No H1</span>
                      )}
                    </td>

                    {/* Word Count */}
                    <td className="py-3 px-4 text-center">
                      <span className={`font-semibold ${page.isThinContent ? 'text-amber-600 font-bold' : 'text-[#333333]'}`}>
                        {page.wordCount.toLocaleString()}
                      </span>
                      {page.isThinContent && (
                        <span className="block text-[10px] text-amber-600 font-bold">Thin</span>
                      )}
                    </td>

                    {/* Canonical */}
                    <td className="py-3 px-4 text-center">
                      {page.canonical.status === 'ok' || page.canonical.status === 'mismatch' ? (
                        <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 font-medium text-[11px]">
                          Set
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-bold text-[11px]">
                          Missing
                        </span>
                      )}
                    </td>

                    {/* Indexability */}
                    <td className="py-3 px-4 text-center">
                      {page.robotsMeta.noindex ? (
                        <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 font-bold text-[11px]">
                          Noindex
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[11px]">
                          Indexable
                        </span>
                      )}
                    </td>

                    {/* Links */}
                    <td className="py-3 px-4 text-center">
                      <div className="font-mono text-[11px] text-[#444444]">
                        <span className={page.incomingInternalLinksCount === 0 ? 'text-amber-600 font-bold' : ''}>
                          {page.incomingInternalLinksCount} in
                        </span>
                        <span className="text-[#AAAAAA] mx-1">/</span>
                        <span>{page.internalLinks.length} out</span>
                      </div>
                    </td>

                    {/* Issues Count */}
                    <td className="py-3 px-4 text-center">
                      {totalIssues === 0 ? (
                        <span className="text-emerald-600 font-bold">0</span>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5">
                          {page.issuesCount.critical > 0 && (
                            <span className="inline-flex items-center text-red-600 font-bold text-[11px]">
                              <AlertCircle className="w-3 h-3 mr-0.5" />
                              {page.issuesCount.critical}
                            </span>
                          )}
                          {page.issuesCount.warning > 0 && (
                            <span className="inline-flex items-center text-amber-600 font-bold text-[11px]">
                              <AlertTriangle className="w-3 h-3 mr-0.5" />
                              {page.issuesCount.warning}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-center">
                      <span className="text-[#F29627] font-semibold text-xs inline-flex items-center gap-1 group-hover:underline">
                        View
                        <ExternalLink className="w-3 h-3" />
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
