import React from 'react';
import { ShieldCheck, RefreshCw } from 'lucide-react';

interface HeaderProps {
  onNewAudit?: () => void;
  isAuditing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onNewAudit, isAuditing }) => {
  return (
    <header className="bg-white border-b border-[#E5E5E5] sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* FWSC Product & digiVirus Branding Hierarchy */}
        <div
          className="flex items-center gap-3.5 cursor-pointer select-none"
          onClick={onNewAudit}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNewAudit?.()}
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-[#F29627] to-[#FF9235] flex items-center justify-center text-white shadow-[0_2px_10px_rgba(242,150,39,0.32)] shrink-0">
            <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
          </div>

          <div className="flex flex-col justify-center">
            <div className="flex items-baseline gap-2">
              <span className="font-['Poppins'] font-black text-2xl tracking-tight text-[#000000] leading-none">
                FWSC
              </span>
              <span className="text-[#D0D0D0] font-light hidden sm:inline">•</span>
              <span className="text-sm font-semibold text-[#222222] tracking-normal leading-none hidden sm:inline">
                Free Website SEO Checker
              </span>
            </div>

            <div className="flex items-center gap-1.5 mt-1 text-xs text-[#777777]">
              <span className="sm:hidden font-medium text-[#444444]">Free Website SEO Checker •</span>
              <span className="text-[#888888] font-normal">by</span>
              <span className="font-bold text-[#000000] tracking-tight">digiVirus</span>
            </div>
          </div>
        </div>

        {/* Header Right Status - Clean and balanced without extra buttons */}
        <div className="flex items-center gap-3">
          {isAuditing && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FFF5ED] border border-[#F29627]/30 text-[#F29627] text-xs font-semibold">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Audit Crawl Active</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

