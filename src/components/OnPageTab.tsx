import React, { useState } from 'react';
import { Type, AlertCircle, AlertTriangle, CheckCircle2, Image as ImageIcon, Code, Share2, ChevronDown, ChevronRight } from 'lucide-react';
import type { CrawledPage, Issue } from '../types';

interface OnPageTabProps {
  pages: CrawledPage[];
  issues: Issue[];
  onSelectPage: (url: string) => void;
}

export const OnPageTab: React.FC<OnPageTabProps> = ({ pages, issues, onSelectPage }) => {
  // Title tag stats
  const missingTitle = pages.filter(p => !p.title.text);
  const shortTitle = pages.filter(p => p.title.text && p.title.length < 30);
  const longTitle = pages.filter(p => p.title.text && p.title.length > 60);

  // Meta description stats
  const missingDesc = pages.filter(p => !p.metaDescription.text);
  const shortDesc = pages.filter(p => p.metaDescription.text && p.metaDescription.length < 70);
  const longDesc = pages.filter(p => p.metaDescription.text && p.metaDescription.length > 160);

  // H1 stats
  const missingH1 = pages.filter(p => p.h1.text.length === 0);
  const multipleH1 = pages.filter(p => p.h1.text.length > 1);
  const skippedHeadings = pages.filter(p => p.headings.issues.length > 0);

  // Images stats
  let totalImages = 0;
  let missingAltCount = 0;
  let emptyAltCount = 0;

  pages.forEach(p => {
    totalImages += p.images.length;
    missingAltCount += p.images.filter(i => i.missingAlt).length;
    emptyAltCount += p.images.filter(i => i.emptyAlt).length;
  });

  // Duplicate titles map
  const titleToPages = new Map<string, string[]>();
  pages.forEach(p => {
    if (p.title.text) {
      const list = titleToPages.get(p.title.text) || [];
      list.push(p.url);
      titleToPages.set(p.title.text, list);
    }
  });
  const duplicateTitles = Array.from(titleToPages.entries()).filter(([_, urls]) => urls.length > 1);

  // Duplicate descriptions map
  const descToPages = new Map<string, string[]>();
  pages.forEach(p => {
    if (p.metaDescription.text) {
      const list = descToPages.get(p.metaDescription.text) || [];
      list.push(p.url);
      descToPages.set(p.metaDescription.text, list);
    }
  });
  const duplicateDescs = Array.from(descToPages.entries()).filter(([_, urls]) => urls.length > 1);

  // Schema types
  const schemaTypesDetected = new Set<string>();
  pages.forEach(p => {
    (p.schemaTypes || []).forEach(t => schemaTypesDetected.add(t));
  });

  return (
    <div className="space-y-6">
      {/* 1. Title Tag Audit */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 shadow-xs">
        <h3 className="font-['Poppins'] font-bold text-base text-[#000000] mb-4 flex items-center gap-2">
          <Type className="w-4 h-4 text-[#F29627]" />
          <span>Title Tag Optimization</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
            <span className="text-xs text-[#666666] block">Missing Titles</span>
            <span className={`text-xl font-bold font-['Poppins'] mt-1 block ${missingTitle.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {missingTitle.length}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
            <span className="text-xs text-[#666666] block">Too Short (&lt; 30 char)</span>
            <span className="text-xl font-bold font-['Poppins'] text-amber-600 mt-1 block">
              {shortTitle.length}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
            <span className="text-xs text-[#666666] block">Too Long (&gt; 60 char)</span>
            <span className="text-xl font-bold font-['Poppins'] text-amber-600 mt-1 block">
              {longTitle.length}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
            <span className="text-xs text-[#666666] block">Duplicate Titles</span>
            <span className={`text-xl font-bold font-['Poppins'] mt-1 block ${duplicateTitles.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {duplicateTitles.length}
            </span>
          </div>
        </div>

        {/* Duplicate Titles Drawer if any */}
        {duplicateTitles.length > 0 && (
          <div className="mt-4 p-4 rounded-xl bg-red-50/50 border border-red-200">
            <span className="text-xs font-bold uppercase tracking-wider text-red-800 block mb-2">
              Duplicate Title Tags Detected ({duplicateTitles.length} clusters)
            </span>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {duplicateTitles.map(([title, urls], i) => (
                <div key={i} className="bg-white p-3 rounded-lg border border-red-200 text-xs">
                  <span className="font-bold text-[#000000] block">"{title}"</span>
                  <div className="mt-1 pl-2 border-l-2 border-red-300 space-y-0.5">
                    {urls.map((u, j) => (
                      <span key={j} className="block font-mono text-[#555555] text-[11px] truncate">
                        • {u}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Meta Description Audit */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 shadow-xs">
        <h3 className="font-['Poppins'] font-bold text-base text-[#000000] mb-4">
          Meta Description Optimization
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
            <span className="text-xs text-[#666666] block">Missing Descriptions</span>
            <span className={`text-xl font-bold font-['Poppins'] mt-1 block ${missingDesc.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {missingDesc.length}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
            <span className="text-xs text-[#666666] block">Too Short (&lt; 70 char)</span>
            <span className="text-xl font-bold font-['Poppins'] text-amber-600 mt-1 block">
              {shortDesc.length}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
            <span className="text-xs text-[#666666] block">Too Long (&gt; 160 char)</span>
            <span className="text-xl font-bold font-['Poppins'] text-amber-600 mt-1 block">
              {longDesc.length}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
            <span className="text-xs text-[#666666] block">Duplicate Descriptions</span>
            <span className={`text-xl font-bold font-['Poppins'] mt-1 block ${duplicateDescs.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {duplicateDescs.length}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Headings Structure (H1 - H6) */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 shadow-xs">
        <h3 className="font-['Poppins'] font-bold text-base text-[#000000] mb-4">
          Heading Structure (H1 & Hierarchy)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
            <span className="text-xs text-[#666666] block">Missing H1 Heading</span>
            <span className={`text-xl font-bold font-['Poppins'] mt-1 block ${missingH1.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {missingH1.length}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
            <span className="text-xs text-[#666666] block">Multiple H1 Headings</span>
            <span className={`text-xl font-bold font-['Poppins'] mt-1 block ${multipleH1.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {multipleH1.length}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
            <span className="text-xs text-[#666666] block">Skipped Heading Levels</span>
            <span className={`text-xl font-bold font-['Poppins'] mt-1 block ${skippedHeadings.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {skippedHeadings.length}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Image SEO Audit */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 shadow-xs">
        <h3 className="font-['Poppins'] font-bold text-base text-[#000000] mb-4 flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-[#F29627]" />
          <span>Image SEO & Alt Text Attributes</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
            <span className="text-xs text-[#666666] block">Total Images Audited</span>
            <span className="text-xl font-bold font-['Poppins'] text-[#000000] mt-1 block">
              {totalImages}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200">
            <span className="text-xs text-amber-700 block">Missing Alt Attribute</span>
            <span className="text-xl font-bold font-['Poppins'] text-amber-800 mt-1 block">
              {missingAltCount}
            </span>
            <span className="text-[11px] text-amber-600">
              {totalImages > 0 ? ((missingAltCount / totalImages) * 100).toFixed(0) : 0}% of all images
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
            <span className="text-xs text-[#666666] block">Empty Alt (alt="")</span>
            <span className="text-xl font-bold font-['Poppins'] text-[#333333] mt-1 block">
              {emptyAltCount}
            </span>
          </div>
        </div>
      </div>

      {/* 5. Structured Data & Schema */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 shadow-xs">
        <h3 className="font-['Poppins'] font-bold text-base text-[#000000] mb-4 flex items-center gap-2">
          <Code className="w-4 h-4 text-[#F29627]" />
          <span>Structured Data & JSON-LD Schemas</span>
        </h3>

        <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5] space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#666666] font-medium">Schema Types Detected</span>
            <span className="font-bold text-[#000000]">{schemaTypesDetected.size} unique types</span>
          </div>

          {schemaTypesDetected.size === 0 ? (
            <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
              No JSON-LD or Microdata structured schemas were found on crawled pages. Consider adding WebSite or Organization schema to enhance rich search snippets.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {Array.from(schemaTypesDetected).map((type, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold font-mono"
                >
                  {type}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
