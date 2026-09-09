import React from 'react';
import { History, Globe, Trash2, ArrowRight, AlertCircle, AlertTriangle } from 'lucide-react';
import type { AuditHistoryItem } from '../types';

interface HistoryListProps {
  history: AuditHistoryItem[];
  onSelectAudit: (id: string) => void;
  onDeleteAudit: (id: string) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({ history, onSelectAudit, onDeleteAudit }) => {
  if (history.length === 0) {
    return null;
  }

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (score >= 70) return 'bg-[#FFF5ED] text-[#F29627] border-[#F29627]/30';
    if (score >= 50) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-red-50 text-red-700 border-red-200';
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-8">
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E5E5E5]">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#F29627]" />
            <h3 className="font-['Poppins'] font-bold text-base text-[#000000]">
              Recent Website Audits ({history.length})
            </h3>
          </div>
          <span className="text-xs text-[#777777]">Stored in your browser history</span>
        </div>

        <div className="divide-y divide-[#E5E5E5]">
          {history.map((item) => (
            <div
              key={item.id}
              className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAFAFA] transition-colors rounded-lg px-2 group cursor-pointer"
              onClick={() => onSelectAudit(item.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FFF5ED] flex items-center justify-center text-[#F29627] shrink-0 border border-[#F29627]/20">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#000000] font-mono group-hover:text-[#F29627] transition-colors">
                      {item.websiteUrl}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#777777] mt-0.5">
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{item.pagesCrawled} pages crawled</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                {/* Score badge */}
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${getScoreColor(item.score)}`}>
                  {item.score} / 100
                </span>

                {/* Issues count */}
                <div className="flex items-center gap-1.5 text-xs">
                  {item.criticalIssues > 0 && (
                    <span className="inline-flex items-center text-red-600 font-bold text-[11px]">
                      <AlertCircle className="w-3.5 h-3.5 mr-0.5" />
                      {item.criticalIssues}
                    </span>
                  )}
                  {item.warnings > 0 && (
                    <span className="inline-flex items-center text-amber-600 font-bold text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5 mr-0.5" />
                      {item.warnings}
                    </span>
                  )}
                </div>

                {/* View button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectAudit(item.id);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#000000] text-white hover:bg-[#222222] font-semibold text-xs flex items-center gap-1 transition-colors"
                >
                  <span>View</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteAudit(item.id);
                  }}
                  className="p-1.5 text-[#888888] hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="Delete Audit"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
