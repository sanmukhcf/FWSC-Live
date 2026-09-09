import React, { useState } from 'react';
import { X, Globe, AlertCircle, AlertTriangle, CheckCircle2, Image as ImageIcon, Link as LinkIcon, FileText, Code2, Shield } from 'lucide-react';
import type { CrawledPage, Issue } from '../types';

interface PageDetailModalProps {
  page: CrawledPage;
  allIssues: Issue[];
  onClose: () => void;
  onNavigatePage?: (url: string) => void;
}

export const PageDetailModal: React.FC<PageDetailModalProps> = ({ page, allIssues, onClose, onNavigatePage }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'headings' | 'images' | 'links' | 'issues'>('overview');

  // Find issues affecting this page
  const pageIssues = allIssues.filter(iss => iss.affectedPages.includes(page.url));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-[#E5E5E5] w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-[#E5E5E5] flex items-start justify-between gap-4 bg-[#FFF5ED]/30">
          <div className="space-y-1 max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                page.statusCode >= 200 && page.statusCode < 300
                  ? 'bg-emerald-100 text-emerald-800'
                  : page.statusCode >= 300 && page.statusCode < 400
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                HTTP {page.statusCode}
              </span>
              <span className="text-xs text-[#666666] font-mono">
                {page.loadTimeMs}ms • {(page.sizeBytes / 1024).toFixed(1)} KB
              </span>
              {page.robotsMeta.noindex ? (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-50 text-red-700">
                  noindex
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700">
                  Indexable
                </span>
              )}
            </div>
            <h3 className="font-['Poppins'] text-lg sm:text-xl font-bold text-[#000000] break-all">
              {page.url}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#666666] hover:text-[#000000] hover:bg-[#F5F5F5] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tab Bar */}
        <div className="flex border-b border-[#E5E5E5] px-6 bg-white overflow-x-auto">
          {[
            { id: 'overview', label: 'Meta & Content', icon: FileText },
            { id: 'headings', label: `Headings (${page.headings.h1.length + page.headings.h2.length + page.headings.h3.length})`, icon: Code2 },
            { id: 'images', label: `Images (${page.images.length})`, icon: ImageIcon },
            { id: 'links', label: `Links (${page.internalLinks.length + page.externalLinks.length})`, icon: LinkIcon },
            { id: 'issues', label: `Issues (${pageIssues.length})`, icon: AlertCircle },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-4 border-b-2 font-semibold text-xs transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-[#F29627] text-[#F29627]'
                    : 'border-transparent text-[#666666] hover:text-[#000000]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Title Tag */}
              <div className="p-4 rounded-xl bg-[#F9F9F9] border border-[#E5E5E5] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider text-[#333333]">
                    Title Tag
                  </span>
                  <span className={`text-xs font-semibold ${
                    page.title.status === 'ok'
                      ? 'text-emerald-600'
                      : page.title.status === 'too_short'
                      ? 'text-amber-600'
                      : 'text-red-600'
                  }`}>
                    {page.title.length} chars ({page.title.status.replace('_', ' ')})
                  </span>
                </div>
                <p className="text-sm font-semibold text-[#000000] bg-white p-3 rounded-lg border border-[#E5E5E5]">
                  {page.title.text || <span className="text-red-500 italic">No Title Tag Detected</span>}
                </p>
                <p className="text-[11px] text-[#777777]">
                  Recommended title length is between 30 and 60 characters.
                </p>
              </div>

              {/* Meta Description */}
              <div className="p-4 rounded-xl bg-[#F9F9F9] border border-[#E5E5E5] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider text-[#333333]">
                    Meta Description
                  </span>
                  <span className={`text-xs font-semibold ${
                    page.metaDescription.status === 'ok'
                      ? 'text-emerald-600'
                      : 'text-amber-600'
                  }`}>
                    {page.metaDescription.length} chars ({page.metaDescription.status.replace('_', ' ')})
                  </span>
                </div>
                <p className="text-xs text-[#333333] bg-white p-3 rounded-lg border border-[#E5E5E5] leading-relaxed">
                  {page.metaDescription.text || <span className="text-red-500 italic">No Meta Description Detected</span>}
                </p>
                <p className="text-[11px] text-[#777777]">
                  Recommended meta description length is between 70 and 160 characters.
                </p>
              </div>

              {/* Content & Technical Snapshot */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-white border border-[#E5E5E5]">
                  <span className="text-xs font-semibold text-[#666666] block">Word Count</span>
                  <span className="text-xl font-bold font-['Poppins'] text-[#000000] mt-1 block">
                    {page.wordCount.toLocaleString()} words
                  </span>
                  <span className="text-[11px] text-[#777777]">
                    Text-to-HTML: {page.textToHtmlRatio}%
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-white border border-[#E5E5E5]">
                  <span className="text-xs font-semibold text-[#666666] block">Canonical URL</span>
                  <span className="text-xs font-mono text-[#000000] mt-1 block truncate">
                    {page.canonical.url || 'Not Specified'}
                  </span>
                  <span className="text-[11px] text-[#777777]">
                    Status: {page.canonical.status}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-white border border-[#E5E5E5]">
                  <span className="text-xs font-semibold text-[#666666] block">Document Attributes</span>
                  <span className="text-xs font-medium text-[#000000] mt-1 block">
                    Lang: {page.lang || 'None'} • Viewport: {page.htmlDoc.hasViewport ? 'Yes' : 'No'}
                  </span>
                  <span className="text-[11px] text-[#777777]">
                    DOCTYPE: {page.htmlDoc.hasDoctype ? 'HTML5' : 'Missing'}
                  </span>
                </div>
              </div>

              {/* Open Graph Metadata */}
              {(page.openGraph.title || page.openGraph.image || page.openGraph.description) && (
                <div className="p-4 rounded-xl bg-[#F9F9F9] border border-[#E5E5E5] space-y-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-[#333333]">
                    Open Graph (Social Sharing)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[#888888] font-medium block">og:title</span>
                      <span className="font-semibold text-[#111111]">{page.openGraph.title || 'None'}</span>
                    </div>
                    <div>
                      <span className="text-[#888888] font-medium block">og:image</span>
                      <span className="font-mono text-[#111111] truncate block">{page.openGraph.image || 'None'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: HEADINGS */}
          {activeTab === 'headings' && (
            <div className="space-y-6">
              {/* Heading Hierarchy issues */}
              {page.headings.issues.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Heading Hierarchy Skipped</span>
                  </div>
                  {page.headings.issues.map((iss, i) => (
                    <p key={i} className="pl-5 text-amber-700">{iss}</p>
                  ))}
                </div>
              )}

              {/* H1 Headings */}
              <div className="p-4 rounded-xl bg-[#F9F9F9] border border-[#E5E5E5] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider text-[#333333]">
                    H1 Headings ({page.headings.h1.length})
                  </span>
                  <span className={`text-xs font-bold ${
                    page.headings.h1.length === 1 ? 'text-emerald-600' : 'text-amber-600'
                  }`}>
                    {page.headings.h1.length === 1 ? '1 H1 (Ideal)' : page.headings.h1.length === 0 ? 'Missing H1' : 'Multiple H1s'}
                  </span>
                </div>
                {page.headings.h1.length > 0 ? (
                  page.headings.h1.map((h1, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-white border border-[#E5E5E5] text-sm font-bold text-[#000000] font-['Poppins']">
                      &lt;h1&gt; {h1}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-red-500 italic">No H1 heading found on this page.</p>
                )}
              </div>

              {/* Subheadings Tree */}
              <div className="p-4 rounded-xl bg-white border border-[#E5E5E5] space-y-3">
                <span className="font-bold text-xs uppercase tracking-wider text-[#333333] block">
                  Subheading Hierarchy (H2 - H6)
                </span>
                <div className="space-y-2 text-xs">
                  {page.headings.h2.map((h2, i) => (
                    <div key={i} className="pl-4 py-1 border-l-2 border-[#F29627] text-[#222222] font-semibold">
                      &lt;h2&gt; {h2}
                    </div>
                  ))}
                  {page.headings.h3.map((h3, i) => (
                    <div key={i} className="pl-8 py-1 border-l-2 border-amber-300 text-[#555555]">
                      &lt;h3&gt; {h3}
                    </div>
                  ))}
                  {page.headings.h4.map((h4, i) => (
                    <div key={i} className="pl-12 py-1 border-l-2 border-zinc-200 text-[#777777]">
                      &lt;h4&gt; {h4}
                    </div>
                  ))}
                  {page.headings.h2.length === 0 && page.headings.h3.length === 0 && (
                    <p className="text-xs text-[#777777] italic">No subheadings (H2-H6) detected.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: IMAGES */}
          {activeTab === 'images' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-semibold text-[#555555]">
                <span>Total Images: {page.images.length}</span>
                <span>
                  Missing Alt Text: {page.images.filter(i => i.missingAlt || i.emptyAlt).length}
                </span>
              </div>

              {page.images.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#777777] bg-[#F9F9F9] rounded-xl border border-[#E5E5E5]">
                  No images found on this page.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {page.images.map((img, i) => {
                    const hasIssue = img.missingAlt || img.emptyAlt;
                    return (
                      <div
                        key={i}
                        className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                          hasIssue ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-[#E5E5E5]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`font-bold text-[11px] px-2 py-0.5 rounded ${
                            hasIssue ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {img.missingAlt ? 'Missing Alt' : img.emptyAlt ? 'Empty Alt' : 'Alt Present'}
                          </span>
                        </div>
                        <p className="font-mono text-[#444444] truncate text-[11px]" title={img.src}>
                          {img.src}
                        </p>
                        <p className="text-[#222222] font-semibold">
                          Alt: {img.alt ? `"${img.alt}"` : <span className="text-red-500 italic">None</span>}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: LINKS */}
          {activeTab === 'links' && (
            <div className="space-y-6">
              {/* Internal Links Outgoing */}
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#333333] mb-2">
                  Outgoing Internal Links ({page.internalLinks.length})
                </h4>
                <div className="bg-white rounded-xl border border-[#E5E5E5] max-h-56 overflow-y-auto divide-y divide-[#F0F0F0] text-xs">
                  {page.internalLinks.length > 0 ? (
                    page.internalLinks.map((link, i) => (
                      <div key={i} className="p-2.5 px-3 flex items-center justify-between hover:bg-[#F9F9F9]">
                        <div className="truncate max-w-lg">
                          <span className="font-medium text-[#111111] block truncate">{link.text}</span>
                          <span className="font-mono text-[11px] text-[#888888] truncate block">{link.href}</span>
                        </div>
                        {onNavigatePage && (
                          <button
                            onClick={() => onNavigatePage(link.href)}
                            className="text-[#F29627] hover:underline font-semibold ml-2 shrink-0"
                          >
                            Inspect
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-[#777777]">No internal links on this page.</div>
                  )}
                </div>
              </div>

              {/* External Links */}
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#333333] mb-2">
                  Outgoing External Links ({page.externalLinks.length})
                </h4>
                <div className="bg-white rounded-xl border border-[#E5E5E5] max-h-48 overflow-y-auto divide-y divide-[#F0F0F0] text-xs">
                  {page.externalLinks.length > 0 ? (
                    page.externalLinks.map((link, i) => (
                      <div key={i} className="p-2.5 px-3 flex items-center justify-between hover:bg-[#F9F9F9]">
                        <span className="font-mono text-[#333333] truncate max-w-xl">{link.href}</span>
                        <span className="text-[11px] text-[#777777] shrink-0 ml-2">{link.text}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-[#777777]">No external links found on this page.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PAGE ISSUES */}
          {activeTab === 'issues' && (
            <div className="space-y-3">
              {pageIssues.length === 0 ? (
                <div className="p-8 text-center bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 space-y-1">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600 mb-2" />
                  <h4 className="font-bold text-sm">No SEO Issues Detected</h4>
                  <p className="text-xs">This page passed all core on-page and technical SEO checks cleanly!</p>
                </div>
              ) : (
                pageIssues.map((iss, i) => (
                  <div key={i} className="p-4 rounded-xl bg-white border border-[#E5E5E5] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                        iss.severity === 'critical'
                          ? 'bg-red-50 text-red-700'
                          : iss.severity === 'warning'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-blue-50 text-blue-700'
                      }`}>
                        {iss.severity}
                      </span>
                      <span className="text-xs text-[#777777] font-semibold">{iss.category}</span>
                    </div>
                    <h5 className="font-bold text-sm text-[#000000] font-['Poppins']">
                      {iss.title}
                    </h5>
                    <p className="text-xs text-[#555555] leading-relaxed">
                      {iss.description}
                    </p>
                    <div className="p-2.5 rounded-lg bg-[#FFF5ED] border border-[#F29627]/20 text-xs text-[#333333] font-medium">
                      <span className="font-bold text-[#F29627]">Fix: </span>
                      {iss.recommendation}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#E5E5E5] flex justify-end bg-white">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#000000] hover:bg-[#222222] text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
