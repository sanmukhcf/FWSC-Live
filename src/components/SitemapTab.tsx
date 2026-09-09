import React, { useState } from 'react';
import { Globe, AlertCircle, Search } from 'lucide-react';
import type { SitemapAnalysis } from '../types';

interface SitemapTabProps {
  sitemap: SitemapAnalysis;
  onSelectPage?: (url: string) => void;
}

export const SitemapTab: React.FC<SitemapTabProps> = ({ sitemap, onSelectPage }) => {
  const [search, setSearch] = useState('');

  const urlList = sitemap.urls || [];
  const filteredUrls = urlList.filter(u =>
    u.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* 1. Sitemap Status Card */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#E5E5E5]">
          <div>
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-[#F29627]" />
              <h3 className="font-['Poppins'] font-bold text-base text-[#000000]">
                XML Sitemap Audit
              </h3>
            </div>
            <p className="text-xs text-[#666666] mt-0.5">
              Verified via standard locations and robots.txt declarations.
            </p>
          </div>

          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            sitemap.exists ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
          }`}>
            {sitemap.exists ? 'Sitemap Found' : 'Missing Sitemap'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
            <span className="text-xs font-semibold text-[#666666] block">Sitemap Location</span>
            <span className="text-xs font-mono text-[#000000] mt-1 block truncate">
              {sitemap.url || 'Not found'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
            <span className="text-xs font-semibold text-[#666666] block">Status</span>
            <span className="text-sm font-bold text-[#000000] mt-1 block">
              {sitemap.exists ? 'Accessible & Valid' : 'Unreachable'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
            <span className="text-xs font-semibold text-[#666666] block">URLs Extracted</span>
            <span className="text-xl font-bold font-['Poppins'] text-[#000000] mt-0.5 block">
              {(sitemap.totalUrls || urlList.length).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Discovered Sitemap URLs */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="font-['Poppins'] font-bold text-base text-[#000000]">
            URLs Declared in XML Sitemap ({urlList.length})
          </h3>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#888888] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search sitemap URLs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#F5F5F5] border border-[#E5E5E5] text-xs text-[#000000] focus:outline-none focus:border-[#F29627] focus:bg-white"
            />
          </div>
        </div>

        {urlList.length === 0 ? (
          <div className="p-8 text-center bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs">
            <AlertCircle className="w-6 h-6 mx-auto text-amber-600 mb-1" />
            No XML sitemap could be found or parsed at standard endpoints (/sitemap.xml).
          </div>
        ) : (
          <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl max-h-72 overflow-y-auto divide-y divide-[#E5E5E5]">
            {filteredUrls.map((url, i) => (
              <div key={i} className="p-2.5 px-3 flex items-center justify-between text-xs hover:bg-white">
                <span className="font-mono text-[#333333] truncate max-w-xl">{url}</span>
                {onSelectPage && (
                  <button
                    onClick={() => onSelectPage(url)}
                    className="text-[#F29627] hover:underline font-semibold shrink-0 ml-2"
                  >
                    Inspect &rarr;
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
