import React from 'react';
import { ShieldCheck, AlertCircle, AlertTriangle, CheckCircle2, Lock, ArrowRight, Layers, FileCode } from 'lucide-react';
import type { CrawledPage, Issue } from '../types';

interface TechnicalTabProps {
  pages: CrawledPage[];
  issues: Issue[];
  onSelectPage: (url: string) => void;
}

export const TechnicalTab: React.FC<TechnicalTabProps> = ({ pages, issues, onSelectPage }) => {
  // Status breakdown
  const status2xx = pages.filter(p => p.statusCode >= 200 && p.statusCode < 300);
  const status3xx = pages.filter(p => p.statusCode >= 300 && p.statusCode < 400);
  const status4xx = pages.filter(p => p.statusCode >= 400 && p.statusCode < 500);
  const status5xx = pages.filter(p => p.statusCode >= 500);

  // Redirect chains
  const redirectPages = pages.filter(p => p.redirectChain && p.redirectChain.length > 0);

  // Mixed content
  const mixedContentPages = pages.filter(p => p.httpsInfo.mixedContent.length > 0);

  // Canonical tag analysis
  const missingCanonical = pages.filter(p => p.canonical.status === 'missing');
  const multipleCanonical = pages.filter(p => p.canonical.status === 'multiple');
  const crossDomainCanonical = pages.filter(p => p.canonical.status === 'cross_domain');

  // HTML Document
  const missingViewport = pages.filter(p => !p.htmlDoc.hasViewport);
  const missingDoctype = pages.filter(p => !p.htmlDoc.hasDoctype);

  return (
    <div className="space-y-6">
      {/* 1. HTTP Status Check Summary */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 shadow-xs">
        <h3 className="font-['Poppins'] font-bold text-base text-[#000000] mb-4">
          HTTP Status Code Distribution
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200">
            <span className="text-xs font-semibold text-emerald-700 block">2xx Success (OK)</span>
            <span className="text-2xl font-bold font-['Poppins'] text-emerald-800 mt-1 block">
              {status2xx.length}
            </span>
            <span className="text-[11px] text-emerald-600">
              {pages.length > 0 ? ((status2xx.length / pages.length) * 100).toFixed(0) : 0}% of pages
            </span>
          </div>

          <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200">
            <span className="text-xs font-semibold text-blue-700 block">3xx Redirects</span>
            <span className="text-2xl font-bold font-['Poppins'] text-blue-800 mt-1 block">
              {status3xx.length}
            </span>
            <span className="text-[11px] text-blue-600">
              Permanent/Temporary
            </span>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200">
            <span className="text-xs font-semibold text-amber-700 block">4xx Client Errors</span>
            <span className="text-2xl font-bold font-['Poppins'] text-amber-800 mt-1 block">
              {status4xx.length}
            </span>
            <span className="text-[11px] text-amber-600">
              404/410 Broken pages
            </span>
          </div>

          <div className="p-4 rounded-xl bg-red-50/50 border border-red-200">
            <span className="text-xs font-semibold text-red-700 block">5xx Server Errors</span>
            <span className="text-2xl font-bold font-['Poppins'] text-red-800 mt-1 block">
              {status5xx.length}
            </span>
            <span className="text-[11px] text-red-600">
              Backend failures
            </span>
          </div>
        </div>

        {/* List of 4xx / 5xx error pages if any */}
        {(status4xx.length > 0 || status5xx.length > 0) && (
          <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200">
            <h4 className="font-bold text-xs uppercase tracking-wider text-red-800 mb-2 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span>HTTP Error Responses Detected ({status4xx.length + status5xx.length})</span>
            </h4>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {[...status4xx, ...status5xx].map((p, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs bg-white p-2 rounded border border-red-200">
                  <span className="font-mono text-[#000000] truncate max-w-lg">{p.url}</span>
                  <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold font-mono">
                    HTTP {p.statusCode}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Redirect Analysis */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-['Poppins'] font-bold text-base text-[#000000]">
              Redirect Analysis
            </h3>
            <p className="text-xs text-[#666666]">
              Detects single redirects, redirect chains, and redirect hops.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#F5F5F5] text-[#333333]">
            {redirectPages.length} Redirects
          </span>
        </div>

        {redirectPages.length === 0 ? (
          <div className="p-6 text-center bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-xs">
            <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-600 mb-1" />
            No redirect chains or unnecessary redirect hops detected!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#FAFAFA] border-b border-[#E5E5E5] text-[#444444] font-bold">
                  <th className="py-2.5 px-3">Original URL</th>
                  <th className="py-2.5 px-3">Final URL</th>
                  <th className="py-2.5 px-3 w-28 text-center">Redirects</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {redirectPages.map((rp, i) => (
                  <tr key={i} className="hover:bg-[#F9F9F9]">
                    <td className="py-2.5 px-3 font-mono text-[#444444] truncate max-w-xs">{rp.url}</td>
                    <td className="py-2.5 px-3 font-mono text-emerald-700 font-semibold truncate max-w-xs">{rp.finalUrl}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        rp.redirectChain.length > 1 ? 'bg-amber-100 text-amber-800' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {rp.redirectChain.length} {rp.redirectChain.length > 1 ? 'hops' : 'hop'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. HTTPS & Mixed Content */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 shadow-xs">
        <h3 className="font-['Poppins'] font-bold text-base text-[#000000] mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4 text-[#F29627]" />
          <span>HTTPS & Mixed Content Security</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-[#F9F9F9] border border-[#E5E5E5]">
            <span className="text-xs font-semibold text-[#666666] block">HTTPS Protocol Enforcement</span>
            <span className="text-sm font-bold text-[#000000] mt-1 block">
              {pages.every(p => p.httpsInfo.isHttps) ? '100% Secure HTTPS' : 'Insecure HTTP Pages Detected'}
            </span>
            <p className="text-[11px] text-[#777777] mt-1">
              Google uses HTTPS as a confirmed ranking signal and flags non-HTTPS sites as "Not Secure".
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#F9F9F9] border border-[#E5E5E5]">
            <span className="text-xs font-semibold text-[#666666] block">Mixed Content Resources</span>
            <span className={`text-sm font-bold mt-1 block ${mixedContentPages.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {mixedContentPages.length === 0 ? 'No Mixed Content' : `${mixedContentPages.length} Pages with HTTP Assets`}
            </span>
            <p className="text-[11px] text-[#777777] mt-1">
              Insecure HTTP assets on an HTTPS page will trigger browser security warnings.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Canonical Tag Analysis */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-['Poppins'] font-bold text-base text-[#000000]">
              Canonical Tag Analysis
            </h3>
            <p className="text-xs text-[#666666]">
              Inspects self-referential canonicals, cross-domain links, and multiple canonical tag conflicts.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
            <span className="text-xs text-[#666666] block">Missing Canonical</span>
            <span className="text-lg font-bold text-[#000000] font-['Poppins'] mt-0.5 block">
              {missingCanonical.length}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
            <span className="text-xs text-[#666666] block">Multiple Canonicals</span>
            <span className="text-lg font-bold text-red-600 font-['Poppins'] mt-0.5 block">
              {multipleCanonical.length}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
            <span className="text-xs text-[#666666] block">Cross-Domain Canonicals</span>
            <span className="text-lg font-bold text-[#000000] font-['Poppins'] mt-0.5 block">
              {crossDomainCanonical.length}
            </span>
          </div>
        </div>
      </div>

      {/* 5. HTML Document Standards */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 shadow-xs">
        <h3 className="font-['Poppins'] font-bold text-base text-[#000000] mb-4 flex items-center gap-2">
          <FileCode className="w-4 h-4 text-[#F29627]" />
          <span>HTML Document Standards & Mobile Viewport</span>
        </h3>

        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5] flex items-center justify-between text-xs">
            <span className="font-semibold text-[#333333]">HTML5 &lt;!DOCTYPE html&gt; Declaration</span>
            <span className={missingDoctype.length === 0 ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
              {missingDoctype.length === 0 ? 'Valid on all pages' : `${missingDoctype.length} pages missing`}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5] flex items-center justify-between text-xs">
            <span className="font-semibold text-[#333333]">Responsive &lt;meta name="viewport"&gt; Tag</span>
            <span className={missingViewport.length === 0 ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>
              {missingViewport.length === 0 ? 'Present on all pages' : `${missingViewport.length} pages missing`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
