import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  Wifi, 
  WifiOff, 
  Menu
} from 'lucide-react';

export const Header: React.FC = () => {
  const { 
    currentUser, 
    activeView, 
    isUndergroundModeActive,
    toggleSimulateOffline,
    toggleMobileNav,
    cachedDocumentIds,
    offlineStorageSizeBytes,
    setActiveView
  } = useApp();

  const viewTitles: Record<string, { title: string; subtitle: string }> = {
    dashboard: {
      title: currentUser.role === 'admin' ? 'Executive Governance Dashboard' : 'Officer Workstation Dashboard',
      subtitle: currentUser.role === 'admin' 
        ? 'Subsidiary-wide document lifecycle, pending approvals, and AI knowledge metrics'
        : `Personalized overview for ${currentUser.subsidiary} mining & exploration operations`
    },
    knowledge: {
      title: 'Knowledge Center',
      subtitle: 'Official governed document repository, version lineage, and extraction pipeline'
    },
    'ai-assistant': {
      title: 'Source-Grounded AI Assistant',
      subtitle: 'Ask technical questions & retrieve historical precedents strictly cited from approved records'
    },
    'my-updates': {
      title: 'My Document Updates & Submissions',
      subtitle: 'Track review statuses, change requests, and approval notes from Central Directorate'
    },
    reports: {
      title: 'Automated Report Generator',
      subtitle: 'Compile auditable statutory briefings and production variance summaries with inline citations'
    },
    'approval-queue': {
      title: 'Central Approval & Governance Queue',
      subtitle: 'Review technical revisions, side-by-side metric diffs, and approve re-indexing'
    },
    'ai-insights': {
      title: 'AI Knowledge Insights & Topic Trends',
      subtitle: 'Organizational knowledge coverage, keyword clusters, and historical inquiry patterns'
    },
    'audit-trail': {
      title: 'Statutory Audit Trail',
      subtitle: 'Immutable record of document modifications, approvals, and AI queries'
    },
    settings: {
      title: 'Governance & Access Configuration',
      subtitle: 'Role permissions matrix, subsidiary mappings, and knowledge retention policies'
    }
  };

  const currentViewMeta = viewTitles[activeView] || { title: 'MineMind AI Platform', subtitle: 'From scattered reports to smarter mining decision' };
  const sizeMb = ((offlineStorageSizeBytes || 0) / (1024 * 1024)).toFixed(1);

  return (
    <header id="minemind-header" className="bg-[#0B2238] border-t-2 border-[#D97706] border-b border-[#1E293B] px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between shadow-md sticky top-0 z-20 transition-colors">
      {/* Mobile Hamburger & View Title / Subtitle with Gov branding */}
      <div className="flex items-center gap-3 min-w-0 pr-2">
        <button
          type="button"
          id="btn-toggle-mobile-menu"
          onClick={toggleMobileNav}
          className="md:hidden p-2 rounded-lg text-white hover:bg-[#112D4E] border border-[#1E3A5F] transition-colors cursor-pointer flex-shrink-0"
          title="Open Navigation Menu"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5 text-current" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-sans font-bold text-sm sm:text-base text-white tracking-tight truncate flex items-center gap-2">
              <span className="truncate">{currentViewMeta.title}</span>
            </h1>
          </div>

          {/* Subtitle with Ministry of Coal & Govt of India banner */}
          <p className="text-[11px] leading-tight truncate mt-0.5 flex items-center gap-1.5">
            <span className="text-[#F59E0B] font-semibold">भारत सरकार | Govt. of India · Ministry of Coal</span>
          </p>
        </div>
      </div>

      {/* Top Bar Controls (Offline Mode Switch, User/Role Pill) */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Underground Mode Switch */}
        <button
          id="btn-toggle-underground-mode"
          onClick={toggleSimulateOffline}
          title={isUndergroundModeActive 
            ? `Underground Mode active (IndexedDB storage: ${cachedDocumentIds.length} files, ${sizeMb} MB). Click to return to Cloud.` 
            : `Central Cloud Mode. Click to simulate low-connectivity underground mine pit (${cachedDocumentIds.length} files cached).`
          }
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
            isUndergroundModeActive
              ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A] hover:bg-[#FDE68A]'
              : 'bg-[#112D4E]/90 text-[#93C5FD] border-[#1E4976] hover:bg-[#1B3E68]'
          }`}
        >
          {isUndergroundModeActive ? (
            <>
              <WifiOff className="w-3.5 h-3.5 text-[#D97706]" />
              <span className="font-semibold text-[11px]">Underground Pit</span>
            </>
          ) : (
            <>
              <Wifi className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span className="font-semibold text-[11px] hidden sm:inline">Cloud Active</span>
            </>
          )}
        </button>

        {/* Current User & Role Pill */}
        <div 
          onClick={() => setActiveView('settings')}
          className="flex items-center gap-2 bg-[#0E1D2F] hover:bg-[#142942] border border-[#1E3A5F] text-white px-2.5 sm:px-3 py-1 rounded-full text-xs cursor-pointer transition-all shadow-xs"
          title={`Logged in as ${currentUser.name} (${currentUser.role.toUpperCase()}) - ${currentUser.subsidiary}. Click to manage settings.`}
        >
          <div className="w-6 h-6 rounded-full bg-[#D97706] text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0 shadow-xs">
            {currentUser.name.charAt(0).toUpperCase()}
          </div>
          <div className="text-left pr-1">
            <div className="font-bold text-[11px] leading-tight truncate max-w-[110px] text-white">{currentUser.name}</div>
            <div className="text-[9px] font-mono text-[#F59E0B] font-semibold uppercase leading-none">
              {currentUser.role === 'admin' ? 'Central Admin' : `${currentUser.subsidiary} HQ`}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
