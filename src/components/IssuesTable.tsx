import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle2, ChevronDown, ChevronRight, ExternalLink, Search } from 'lucide-react';
import type { Issue, IssueSeverity, IssueCategory } from '../types';

interface IssuesTableProps {
  issues: Issue[];
  onSelectPage?: (url: string) => void;
}

export const IssuesTable: React.FC<IssuesTableProps> = ({ issues, onSelectPage }) => {
  const [severityFilter, setSeverityFilter] = useState<IssueSeverity | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<IssueCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);

  const filteredIssues = issues.filter(issue => {
    if (severityFilter !== 'all' && issue.severity !== severityFilter) return false;
    if (categoryFilter !== 'all' && issue.category !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        issue.title.toLowerCase().includes(q) ||
        issue.description.toLowerCase().includes(q) ||
        issue.recommendation.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getSeverityBadge = (sev: IssueSeverity) => {
    switch (sev) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-50 text-red-700 text-xs font-bold border border-red-200">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            Critical
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            Warning
          </span>
        );
      case 'info':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
            <Info className="w-3.5 h-3.5 shrink-0" />
            Info
          </span>
        );
      case 'passed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            Passed
          </span>
        );
    }
  };

  const countBySeverity = {
    critical: issues.filter(i => i.severity === 'critical').length,
    warning: issues.filter(i => i.severity === 'warning').length,
    info: issues.filter(i => i.severity === 'info').length,
    passed: issues.filter(i => i.severity === 'passed').length,
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden shadow-xs">
      {/* Controls Bar */}
      <div className="p-4 sm:p-6 border-b border-[#E5E5E5] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Severity Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSeverityFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                severityFilter === 'all'
                  ? 'bg-[#000000] text-white shadow-xs'
                  : 'bg-[#F5F5F5] text-[#555555] hover:bg-[#E5E5E5]'
              }`}
            >
              All ({issues.length})
            </button>
            <button
              onClick={() => setSeverityFilter('critical')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                severityFilter === 'critical'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              Critical ({countBySeverity.critical})
            </button>
            <button
              onClick={() => setSeverityFilter('warning')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                severityFilter === 'warning'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              Warnings ({countBySeverity.warning})
            </button>
            <button
              onClick={() => setSeverityFilter('info')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                severityFilter === 'info'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              Info ({countBySeverity.info})
            </button>
            <button
              onClick={() => setSeverityFilter('passed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                severityFilter === 'passed'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Passed ({countBySeverity.passed})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-[#888888] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search issues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#F5F5F5] border border-[#E5E5E5] text-xs text-[#000000] placeholder-[#888888] focus:outline-none focus:border-[#F29627] focus:bg-white"
            />
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#F0F0F0]">
          <span className="text-xs font-bold text-[#666666] mr-1">Category:</span>
          {(['all', 'Technical', 'On-Page', 'Content', 'Links', 'Crawlability'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                categoryFilter === cat
                  ? 'bg-[#F29627] text-white'
                  : 'bg-[#F5F5F5] text-[#555555] hover:bg-[#FFF5ED] hover:text-[#F29627]'
              }`}
            >
              {cat === 'all' ? 'All Categories' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Issues Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#FAFAFA] border-b border-[#E5E5E5] text-[#444444] font-bold uppercase tracking-wider">
              <th className="py-3 px-4 w-10"></th>
              <th className="py-3 px-4 w-28">Severity</th>
              <th className="py-3 px-4 w-32">Category</th>
              <th className="py-3 px-4">Issue</th>
              <th className="py-3 px-4 w-36 text-center">Affected Pages</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E5E5]">
            {filteredIssues.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-[#777777]">
                  No issues found matching your current filter criteria.
                </td>
              </tr>
            ) : (
              filteredIssues.map((issue) => {
                const isExpanded = expandedIssueId === issue.id;
                return (
                  <React.Fragment key={issue.id}>
                    <tr
                      onClick={() => setExpandedIssueId(isExpanded ? null : issue.id)}
                      className={`hover:bg-[#FFFDFB] cursor-pointer transition-colors ${
                        isExpanded ? 'bg-[#FFF5ED]/40' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-[#888888]">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-[#F29627]" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </td>
                      <td className="py-3 px-4">{getSeverityBadge(issue.severity)}</td>
                      <td className="py-3 px-4 font-semibold text-[#555555]">
                        {issue.category}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-[#000000] text-sm block font-['Poppins']">
                          {issue.title}
                        </span>
                        <p className="text-xs text-[#666666] line-clamp-1 mt-0.5">
                          {issue.description}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {issue.affectedPages.length > 0 ? (
                          <span className="inline-block px-2.5 py-1 rounded-full bg-[#F5F5F5] font-bold text-[#333333]">
                            {issue.affectedPages.length} {issue.affectedPages.length === 1 ? 'page' : 'pages'}
                          </span>
                        ) : (
                          <span className="text-[#888888] font-medium">-</span>
                        )}
                      </td>
                    </tr>

                    {/* Expanded Drawer Details */}
                    {isExpanded && (
                      <tr className="bg-[#FFFDFB] border-b border-[#E5E5E5]">
                        <td colSpan={5} className="p-4 sm:p-6 pl-12 space-y-4">
                          {/* Description */}
                          <div>
                            <h5 className="font-bold text-xs uppercase tracking-wider text-[#333333] mb-1">
                              Description
                            </h5>
                            <p className="text-xs text-[#444444] leading-relaxed">
                              {issue.description}
                            </p>
                          </div>

                          {/* Recommended Fix */}
                          <div className="p-3.5 rounded-xl bg-[#FFF5ED] border border-[#F29627]/30">
                            <h5 className="font-bold text-xs uppercase tracking-wider text-[#F29627] mb-1">
                              Recommended Fix
                            </h5>
                            <p className="text-xs text-[#333333] leading-relaxed font-medium">
                              {issue.recommendation}
                            </p>
                          </div>

                          {/* Affected Pages List */}
                          {issue.affectedPages.length > 0 && (
                            <div>
                              <h5 className="font-bold text-xs uppercase tracking-wider text-[#333333] mb-2">
                                Affected URLs ({issue.affectedPages.length})
                              </h5>
                              <div className="bg-white border border-[#E5E5E5] rounded-xl max-h-48 overflow-y-auto divide-y divide-[#F0F0F0]">
                                {issue.affectedPages.map((pageUrl, pIdx) => (
                                  <div
                                    key={pIdx}
                                    className="p-2.5 px-3 flex items-center justify-between text-xs hover:bg-[#F9F9F9]"
                                  >
                                    <span className="font-mono text-[#222222] truncate max-w-xl">
                                      {pageUrl}
                                    </span>
                                    {onSelectPage && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onSelectPage(pageUrl);
                                        }}
                                        className="text-[#F29627] hover:underline font-semibold flex items-center gap-1 shrink-0 ml-2"
                                      >
                                        <span>Inspect</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
