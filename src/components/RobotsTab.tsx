import React from 'react';
import { ShieldCheck, AlertCircle, FileText, Lock } from 'lucide-react';
import type { RobotsAnalysis } from '../types';

interface RobotsTabProps {
  robots: RobotsAnalysis;
}

export const RobotsTab: React.FC<RobotsTabProps> = ({ robots }) => {
  const hasSyntaxIssues = robots.issues && robots.issues.length > 0;

  return (
    <div className="space-y-6">
      {/* 1. Robots.txt Overview */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#E5E5E5]">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#F29627]" />
              <h3 className="font-['Poppins'] font-bold text-base text-[#000000]">
                Robots.txt Analysis
              </h3>
            </div>
            <p className="text-xs text-[#666666] mt-0.5">
              Controls search crawler access to your site pathways.
            </p>
          </div>

          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            robots.exists ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
          }`}>
            {robots.exists ? 'robots.txt Found' : 'Missing robots.txt'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
            <span className="text-xs font-semibold text-[#666666] block">Syntax Validity</span>
            <span className={`text-sm font-bold mt-1 block ${!hasSyntaxIssues ? 'text-emerald-700' : 'text-red-700'}`}>
              {!hasSyntaxIssues ? 'Clean Directives' : `${robots.issues.length} Directive Warnings`}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
            <span className="text-xs font-semibold text-[#666666] block">Blocked Directives</span>
            <span className="text-xl font-bold font-['Poppins'] text-[#000000] mt-0.5 block">
              {(robots.blockedPaths || []).length} Disallow paths
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
            <span className="text-xs font-semibold text-[#666666] block">Declared Sitemaps</span>
            <span className="text-xl font-bold font-['Poppins'] text-[#000000] mt-0.5 block">
              {(robots.sitemaps || []).length} Sitemaps
            </span>
          </div>
        </div>

        {/* Syntax error alerts if any */}
        {hasSyntaxIssues && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
            <span className="font-bold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              Syntax Warnings Detected in robots.txt:
            </span>
            {robots.issues.map((err, idx) => (
              <p key={idx} className="pl-5 font-mono text-amber-700">{err}</p>
            ))}
          </div>
        )}
      </div>

      {/* 2. Blocked Paths & Sitemaps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Blocked Paths */}
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 shadow-xs">
          <h3 className="font-['Poppins'] font-bold text-base text-[#000000] mb-3 flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#F29627]" />
            <span>Disallowed Paths ({(robots.blockedPaths || []).length})</span>
          </h3>
          {(robots.blockedPaths || []).length === 0 ? (
            <p className="text-xs text-[#777777] italic">No Disallow rules are currently active in robots.txt.</p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto font-mono text-xs">
              {robots.blockedPaths.map((path, i) => (
                <div key={i} className="p-2 bg-[#FAFAFA] rounded border border-[#E5E5E5] text-[#333333]">
                  Disallow: {path}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Declared Sitemaps */}
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 shadow-xs">
          <h3 className="font-['Poppins'] font-bold text-base text-[#000000] mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#F29627]" />
            <span>Declared Sitemaps ({(robots.sitemaps || []).length})</span>
          </h3>
          {(robots.sitemaps || []).length === 0 ? (
            <p className="text-xs text-[#777777] italic">No Sitemap declarations found inside robots.txt.</p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto font-mono text-xs">
              {robots.sitemaps.map((sm, i) => (
                <div key={i} className="p-2 bg-[#FAFAFA] rounded border border-[#E5E5E5] text-[#333333] truncate">
                  Sitemap: {sm}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. Raw robots.txt Viewer */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 shadow-xs">
        <h3 className="font-['Poppins'] font-bold text-base text-[#000000] mb-3">
          Raw robots.txt Content
        </h3>
        <pre className="p-4 rounded-xl bg-[#111111] text-emerald-400 font-mono text-xs overflow-x-auto max-h-64 leading-relaxed border border-[#333333]">
          {robots.content || '# No robots.txt content was retrieved'}
        </pre>
      </div>
    </div>
  );
};
