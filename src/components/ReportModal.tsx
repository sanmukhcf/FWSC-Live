import React from 'react';
import { X, Printer, ShieldCheck, Download, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import type { AuditResult } from '../types';

interface ReportModalProps {
  audit: AuditResult;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ audit, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const criticalIssues = audit.issues.filter(i => i.severity === 'critical');
  const warningIssues = audit.issues.filter(i => i.severity === 'warning');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-2xl border border-[#E5E5E5] w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden print:max-h-none print:shadow-none print:border-none">
        {/* Modal Controls Header */}
        <div className="p-4 sm:p-6 border-b border-[#E5E5E5] flex items-center justify-between bg-[#FFF5ED]/40 print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#F29627]" />
            <h3 className="font-['Poppins'] font-bold text-base text-[#000000]">
              FWSC - Free Website SEO Checker Audit Report
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#000000] text-white text-xs font-bold hover:bg-[#222222] transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#666666] hover:bg-[#F5F5F5] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Content */}
        <div className="p-6 sm:p-10 overflow-y-auto flex-1 space-y-8 print:p-0 print:overflow-visible text-[#000000]">
          {/* Report Cover / Header */}
          <div className="border-b-2 border-[#F29627] pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-2">
                <img
                  src="/digivirus-logo.png"
                  alt="digiVirus"
                  className="h-6 w-auto object-contain"
                  referrerPolicy="no-referrer"
                />
                <span className="text-[#CCCCCC] hidden sm:inline">•</span>
                <span className="font-['Poppins'] font-bold text-lg text-[#000000]">
                  FWSC <span className="font-normal text-sm text-[#555555]">— Free Website SEO Checker</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FFF5ED] text-[#F29627] border border-[#F29627]/30">
                  OFFICIAL AUDIT REPORT
                </span>
              </div>
              <h1 className="font-['Poppins'] text-2xl sm:text-3xl font-extrabold text-[#000000]">
                Website SEO Technical & On-Page Audit
              </h1>
              <p className="text-sm font-mono text-[#555555] mt-1">
                Domain: <span className="font-bold text-[#000000]">{audit.normalizedDomain}</span>
              </p>
              <p className="text-xs text-[#777777]">
                Audit Date: {new Date(audit.createdAt).toLocaleDateString()} at {new Date(audit.createdAt).toLocaleTimeString()}
              </p>
            </div>

            {/* Overall Score Badge */}
            <div className="p-4 rounded-2xl bg-[#FFF5ED] border border-[#F29627]/30 text-center min-w-[140px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#F29627] block">
                SEO Health Score
              </span>
              <span className="font-['Poppins'] text-4xl font-black text-[#000000] leading-none my-1 block">
                {audit.scores.overall}
              </span>
              <span className="text-xs font-bold text-[#F29627] uppercase">
                {audit.scores.status}
              </span>
            </div>
          </div>

          {/* Executive Summary & Scores Grid */}
          <div className="space-y-3">
            <h3 className="font-['Poppins'] font-bold text-lg text-[#000000] border-b border-[#E5E5E5] pb-2">
              1. Performance Breakdown by Category
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 bg-[#F9F9F9] rounded-xl border border-[#E5E5E5] text-center">
                <span className="text-xs text-[#666666] font-medium block">Technical</span>
                <span className="text-xl font-bold font-['Poppins'] text-[#000000]">{audit.scores.technical}%</span>
              </div>
              <div className="p-3 bg-[#F9F9F9] rounded-xl border border-[#E5E5E5] text-center">
                <span className="text-xs text-[#666666] font-medium block">On-Page</span>
                <span className="text-xl font-bold font-['Poppins'] text-[#000000]">{audit.scores.onPage}%</span>
              </div>
              <div className="p-3 bg-[#F9F9F9] rounded-xl border border-[#E5E5E5] text-center">
                <span className="text-xs text-[#666666] font-medium block">Content</span>
                <span className="text-xl font-bold font-['Poppins'] text-[#000000]">{audit.scores.content}%</span>
              </div>
              <div className="p-3 bg-[#F9F9F9] rounded-xl border border-[#E5E5E5] text-center">
                <span className="text-xs text-[#666666] font-medium block">Links</span>
                <span className="text-xl font-bold font-['Poppins'] text-[#000000]">{audit.scores.linkStructure}%</span>
              </div>
              <div className="p-3 bg-[#F9F9F9] rounded-xl border border-[#E5E5E5] text-center col-span-2 sm:col-span-1">
                <span className="text-xs text-[#666666] font-medium block">Crawlability</span>
                <span className="text-xl font-bold font-['Poppins'] text-[#000000]">{audit.scores.crawlability}%</span>
              </div>
            </div>
          </div>

          {/* Crawl Summary Metrics */}
          <div className="space-y-3">
            <h3 className="font-['Poppins'] font-bold text-lg text-[#000000] border-b border-[#E5E5E5] pb-2">
              2. Crawl & Discovery Metrics
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-[#F9F9F9] rounded-xl border border-[#E5E5E5]">
                <span className="text-[#666666] block">Pages Crawled</span>
                <span className="text-base font-bold text-[#000000]">{audit.pagesCrawledCount} of {audit.pagesDiscoveredCount}</span>
              </div>
              <div className="p-3 bg-[#F9F9F9] rounded-xl border border-[#E5E5E5]">
                <span className="text-[#666666] block">Total Issues</span>
                <span className="text-base font-bold text-[#000000]">{audit.issueCounts.total} issues</span>
              </div>
              <div className="p-3 bg-[#F9F9F9] rounded-xl border border-[#E5E5E5]">
                <span className="text-[#666666] block">XML Sitemap</span>
                <span className="text-base font-bold text-emerald-700">{audit.sitemapAnalysis.exists ? 'Discovered' : 'Missing'}</span>
              </div>
              <div className="p-3 bg-[#F9F9F9] rounded-xl border border-[#E5E5E5]">
                <span className="text-[#666666] block">Robots.txt</span>
                <span className="text-base font-bold text-emerald-700">{audit.robotsAnalysis.exists ? 'Active' : 'Missing'}</span>
              </div>
            </div>
          </div>

          {/* Critical Issues & Recommendations */}
          <div className="space-y-3">
            <h3 className="font-['Poppins'] font-bold text-lg text-[#000000] border-b border-[#E5E5E5] pb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span>3. Critical Action Items ({criticalIssues.length})</span>
            </h3>
            {criticalIssues.length === 0 ? (
              <p className="text-xs text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                No critical SEO issues found! The website adheres cleanly to high-priority search crawler specifications.
              </p>
            ) : (
              <div className="space-y-3">
                {criticalIssues.map((iss, i) => (
                  <div key={i} className="p-4 rounded-xl border border-red-200 bg-red-50/20 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-[#000000] font-['Poppins']">{iss.title}</span>
                      <span className="font-bold text-red-700">{iss.affectedPages.length} pages affected</span>
                    </div>
                    <p className="text-[#555555]">{iss.description}</p>
                    <p className="p-2 rounded bg-white border border-[#E5E5E5] text-[#111111] font-medium">
                      <span className="font-bold text-[#F29627]">Fix: </span> {iss.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Warnings List */}
          <div className="space-y-3">
            <h3 className="font-['Poppins'] font-bold text-lg text-[#000000] border-b border-[#E5E5E5] pb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span>4. Warnings & Optimization Opportunities ({warningIssues.length})</span>
            </h3>
            <div className="space-y-2">
              {warningIssues.slice(0, 8).map((iss, i) => (
                <div key={i} className="p-3 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#000000]">{iss.title}</span>
                    <span className="text-[#777777] font-semibold">{iss.affectedPages.length} pages</span>
                  </div>
                  <p className="text-[#666666]">{iss.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Report Footer */}
          <div className="pt-6 border-t border-[#E5E5E5] text-center text-xs text-[#777777] space-y-1">
            <p>
              Generated by <span className="font-bold text-[#000000]">FWSC</span> (Free Website SEO Checker) by <span className="font-semibold text-[#111111]">digiVirus</span>.
            </p>
            <p className="text-[11px] text-[#999999]">
              100% API-free website crawling and SEO analysis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
