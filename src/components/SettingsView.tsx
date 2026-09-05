import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { sounds } from '../utils/soundEffects';
import { 
  getSavedGoogleClientId, 
  saveGoogleClientId, 
  GOOGLE_CONSOLE_CONFIG 
} from '../googleAuth';
import { 
  Settings, 
  Sun, 
  Moon, 
  Volume2, 
  VolumeX, 
  Bell, 
  HardDrive, 
  DownloadCloud, 
  Wifi, 
  WifiOff, 
  Check, 
  Play,
  ShieldCheck,
  Database,
  Layers,
  FileCheck2,
  Trash2,
  Key,
  Copy,
  ExternalLink
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { 
    currentUser, 
    setToastMessage,
    isSimulatedOffline,
    toggleSimulateOffline,
    cachedDocumentIds,
    precacheAllDocumentsForUnderground,
    offlineStorageSizeBytes,
    lastOfflineSyncTime,
    documents,
    chunks
  } = useApp();

  // 1. Theme Setting (Light / Dark / Amber / High Contrast)
  const [currentTheme, setCurrentTheme] = useState<string>(() => {
    try {
      return localStorage.getItem('minemind_theme') || 'light';
    } catch {
      return 'light';
    }
  });

  const handleThemeChange = (theme: 'light' | 'dark' | 'amber' | 'contrast') => {
    setCurrentTheme(theme);
    const root = document.documentElement;
    root.classList.remove('dark', 'theme-amber', 'theme-contrast');
    if (theme === 'dark') root.classList.add('dark');
    if (theme === 'amber') root.classList.add('theme-amber');
    if (theme === 'contrast') root.classList.add('theme-contrast');
    try { localStorage.setItem('minemind_theme', theme); } catch {}
    sounds.playClick();
  };

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'theme-amber', 'theme-contrast');
    if (currentTheme === 'dark') root.classList.add('dark');
    if (currentTheme === 'amber') root.classList.add('theme-amber');
    if (currentTheme === 'contrast') root.classList.add('theme-contrast');
  }, [currentTheme]);

  // 2. Sound Effects
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => sounds.isEnabled());
  const [soundVolume, setSoundVolume] = useState<number>(() => sounds.getVolume());

  const handleToggleSound = (enabled: boolean) => {
    setSoundEnabled(enabled);
    sounds.setEnabled(enabled);
    if (enabled) {
      sounds.playSuccess();
    }
  };

  const handleVolumeChange = (vol: number) => {
    setSoundVolume(vol);
    sounds.setVolume(vol);
  };

  // 3. Notifications
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('minemind_notifs_enabled') !== 'false';
    } catch {
      return true;
    }
  });

  const handleToggleNotifications = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    try {
      localStorage.setItem('minemind_notifs_enabled', enabled ? 'true' : 'false');
    } catch {}
    if (enabled) {
      sounds.playSuccess();
      setToastMessage({
        type: 'info',
        text: 'In-app notifications enabled.',
      });
    }
  };

  // 4. Google Cloud Console & OAuth Settings
  const [googleClientId, setGoogleClientId] = useState<string>(() => getSavedGoogleClientId());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleSaveGoogleClientId = (e: React.FormEvent) => {
    e.preventDefault();
    saveGoogleClientId(googleClientId);
    sounds.playSuccess();
    setToastMessage({
      type: 'success',
      text: 'Google OAuth Client ID saved successfully.',
    });
  };

  const handleCopyOrigin = (url: string, keyName: string) => {
    navigator.clipboard.writeText(url);
    setCopiedKey(keyName);
    sounds.playClick();
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div id="settings-view" className="p-4 sm:p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white border border-[#E4E0D6] rounded-xl p-5 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#FAF8F3] border border-[#E4E0D6] flex items-center justify-center">
            <Settings className="w-5 h-5 text-[#C8892E]" />
          </div>
          <div>
            <h2 className="font-sans font-bold text-lg text-[#141C2B]">
              Settings & Preferences
            </h2>
            <p className="text-xs text-[#64748B]">
              Manage display theme, sound feedback, notifications, and offline access.
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-[#166534] bg-[#F0FDF4] border border-[#BBF7D0] px-3 py-1.5 rounded-lg">
          <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
          <span>Active Session: {currentUser.role === 'admin' ? 'Admin' : 'Officer'}</span>
        </div>
      </div>

      {/* Main Settings List */}
      <div className="space-y-4">
        {/* 1. Theme / Appearance */}
        <div className="bg-white border border-[#E4E0D6] rounded-xl p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-sans font-bold text-sm text-[#141C2B] flex items-center gap-2">
                <Sun className="w-4 h-4 text-[#C8892E]" />
                <span>Appearance Theme</span>
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Switch between standard light view and low-glare dark view.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 bg-[#FAF8F3] p-1 rounded-lg border border-[#E4E0D6]">
              <button
                type="button"
                onClick={() => handleThemeChange('light')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  currentTheme === 'light' 
                    ? 'bg-white text-[#141C2B] shadow-xs font-bold' 
                    : 'text-[#64748B] hover:text-[#141C2B]'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-[#C8892E]" />
                <span>Light</span>
              </button>

              <button
                type="button"
                onClick={() => handleThemeChange('dark')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  currentTheme === 'dark' 
                    ? 'bg-[#141C2B] text-white shadow-xs font-bold' 
                    : 'text-[#64748B] hover:text-[#141C2B]'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-[#C8892E]" />
                <span>Dark</span>
              </button>

              <button
                type="button"
                onClick={() => handleThemeChange('amber')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  currentTheme === 'amber' 
                    ? 'bg-[#523719] text-[#FEF3C7] shadow-xs font-bold' 
                    : 'text-[#64748B] hover:text-[#141C2B]'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]"></span>
                <span>Amber OLED</span>
              </button>

              <button
                type="button"
                onClick={() => handleThemeChange('contrast')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  currentTheme === 'contrast' 
                    ? 'bg-black text-[#F59E0B] border border-[#F59E0B] shadow-xs font-bold' 
                    : 'text-[#64748B] hover:text-[#141C2B]'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></span>
                <span>DGMS Contrast</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. Sound Effects */}
        <div className="bg-white border border-[#E4E0D6] rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-sans font-bold text-sm text-[#141C2B] flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-[#C8892E]" />
                <span>Sound & Audio Effects</span>
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Play acoustic feedback for button actions, successful filings, and notifications.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleToggleSound(!soundEnabled)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                soundEnabled
                  ? 'bg-[#166534] text-white'
                  : 'bg-[#FAF8F3] text-[#64748B] border border-[#E4E0D6]'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-[#86EFAC]" /> : <VolumeX className="w-4 h-4" />}
              <span>{soundEnabled ? 'Sound Enabled' : 'Muted'}</span>
            </button>
          </div>

          {soundEnabled && (
            <div className="pt-3 border-t border-[#EFEBE2] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 max-w-sm">
                <span className="text-xs font-semibold text-[#141C2B]">Volume</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={soundVolume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="flex-1 accent-[#C8892E] cursor-pointer"
                />
                <span className="text-xs font-mono font-bold text-[#C8892E] w-8">
                  {Math.round(soundVolume * 100)}%
                </span>
              </div>

              <button
                type="button"
                onClick={() => sounds.playSuccess()}
                className="px-3 py-1.5 bg-[#FAF8F3] hover:bg-[#EFEBE2] text-[#141C2B] border border-[#E4E0D6] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
              >
                <Play className="w-3 h-3 text-[#16A34A]" />
                <span>Test Sound</span>
              </button>
            </div>
          )}
        </div>

        {/* 3. Notifications */}
        <div className="bg-white border border-[#E4E0D6] rounded-xl p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-sans font-bold text-sm text-[#141C2B] flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#C8892E]" />
                <span>In-App Notifications & Alerts</span>
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Display banner alerts for urgent safety circulars, approvals, and report completions.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleToggleNotifications(!notificationsEnabled)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                notificationsEnabled
                  ? 'bg-[#141C2B] text-[#C8892E]'
                  : 'bg-[#FAF8F3] text-[#64748B] border border-[#E4E0D6]'
              }`}
            >
              <Check className={`w-4 h-4 ${notificationsEnabled ? 'text-[#C8892E]' : 'text-transparent'}`} />
              <span>{notificationsEnabled ? 'Enabled' : 'Disabled'}</span>
            </button>
          </div>
        </div>

        {/* 4. Google Cloud Console & OAuth Setup */}
        <div className="bg-white border border-[#E4E0D6] rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h3 className="font-sans font-bold text-sm text-[#141C2B] flex items-center gap-2">
                <Key className="w-4 h-4 text-[#C8892E]" />
                <span>Google Cloud Console &amp; OAuth 2.0 Client</span>
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5 max-w-xl">
                Configure your official Google Cloud Console Web Application credentials to enable direct single sign-on.
              </p>
            </div>

            <a
              href={GOOGLE_CONSOLE_CONFIG.consoleUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="text-xs font-bold text-[#00529B] hover:underline flex items-center gap-1 self-start"
            >
              <span>Google Cloud Console</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Form to save Client ID */}
          <form onSubmit={handleSaveGoogleClientId} className="space-y-2 pt-1">
            <label className="block text-xs font-semibold text-[#141C2B]">
              OAuth 2.0 Web Client ID
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                value={googleClientId}
                onChange={(e) => setGoogleClientId(e.target.value)}
                placeholder="e.g. 1234567890-abcdefg.apps.googleusercontent.com"
                className="flex-1 px-3.5 py-2 text-xs bg-[#FAF8F3] border border-[#E4E0D6] rounded-lg focus:outline-none focus:border-[#C8892E] font-mono text-[#141C2B]"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#141C2B] hover:bg-[#0B1528] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                Save Client ID
              </button>
            </div>
            <p className="text-[11px] text-[#64748B]">
              Can also be defined via <code className="font-mono text-[#141C2B] bg-[#FAF8F3] px-1 py-0.5 rounded border border-[#E4E0D6]">GOOGLE_CLIENT_ID</code> in AI Studio settings.
            </p>
          </form>

          {/* Authorized Origins Reference */}
          <div className="pt-2 border-t border-[#EFEBE2] space-y-2">
            <div className="text-xs font-semibold text-[#141C2B]">
              Authorized JavaScript Origins to add in Google Cloud Console:
            </div>
            <div className="grid grid-cols-1 gap-1.5 font-mono text-[11px]">
              <div className="flex items-center justify-between gap-2 p-2 bg-[#FAF8F3] rounded-lg border border-[#E4E0D6]">
                <span className="truncate text-[#141C2B] select-all">{GOOGLE_CONSOLE_CONFIG.devUrl}</span>
                <button
                  type="button"
                  onClick={() => handleCopyOrigin(GOOGLE_CONSOLE_CONFIG.devUrl, 'dev')}
                  className="px-2 py-1 bg-white hover:bg-[#EFEBE2] border border-[#D5D0C5] rounded text-[10px] font-bold text-[#141C2B] flex items-center gap-1 cursor-pointer flex-shrink-0"
                >
                  {copiedKey === 'dev' ? <Check className="w-3 h-3 text-[#16A34A]" /> : <Copy className="w-3 h-3 text-[#64748B]" />}
                  <span>{copiedKey === 'dev' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 p-2 bg-[#FAF8F3] rounded-lg border border-[#E4E0D6]">
                <span className="truncate text-[#141C2B] select-all">{GOOGLE_CONSOLE_CONFIG.sharedUrl}</span>
                <button
                  type="button"
                  onClick={() => handleCopyOrigin(GOOGLE_CONSOLE_CONFIG.sharedUrl, 'shared')}
                  className="px-2 py-1 bg-white hover:bg-[#EFEBE2] border border-[#D5D0C5] rounded text-[10px] font-bold text-[#141C2B] flex items-center gap-1 cursor-pointer flex-shrink-0"
                >
                  {copiedKey === 'shared' ? <Check className="w-3 h-3 text-[#16A34A]" /> : <Copy className="w-3 h-3 text-[#64748B]" />}
                  <span>{copiedKey === 'shared' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Offline Pit Cache & Local Storage Management */}
        <div className="bg-white border border-[#E4E0D6] rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h3 className="font-sans font-bold text-sm text-[#141C2B] flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-[#C8892E]" />
                <span>Offline Storage & Pit Cache</span>
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5 max-w-xl">
                Pre-caches approved geological reports, mine plans, and SOP chunks into local browser storage for zero-connectivity underground mine workings.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#166534] bg-[#DCFCE7] border border-[#BBF7D0] px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#16A34A]" />
                <span>{cachedDocumentIds.length} / {documents.length} Files Cached</span>
              </span>
            </div>
          </div>

          {/* Storage Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="bg-[#FAF8F3] border border-[#E4E0D6] rounded-lg p-3">
              <div className="flex items-center justify-between text-[#64748B] mb-1">
                <span className="text-[11px] font-medium">Downloaded Files</span>
                <FileCheck2 className="w-3.5 h-3.5 text-[#C8892E]" />
              </div>
              <div className="font-sans font-bold text-lg text-[#141C2B]">
                {cachedDocumentIds.length} <span className="text-xs font-normal text-[#64748B]">/ {documents.length} docs</span>
              </div>
              <div className="text-[10px] text-[#166534] font-medium mt-1">
                {Math.round((cachedDocumentIds.length / Math.max(1, documents.length)) * 100)}% repository offline ready
              </div>
            </div>

            <div className="bg-[#FAF8F3] border border-[#E4E0D6] rounded-lg p-3">
              <div className="flex items-center justify-between text-[#64748B] mb-1">
                <span className="text-[11px] font-medium">Storage Consumed</span>
                <HardDrive className="w-3.5 h-3.5 text-[#C8892E]" />
              </div>
              <div className="font-sans font-bold text-lg text-[#141C2B]">
                {((offlineStorageSizeBytes || 0) / (1024 * 1024)).toFixed(2)}{' '}
                <span className="text-xs font-normal text-[#64748B]">MB</span>
              </div>
              <div className="text-[10px] text-[#64748B] font-mono mt-1">
                ~{Math.round((offlineStorageSizeBytes || 0) / 1024)} KB indexed
              </div>
            </div>

            <div className="bg-[#FAF8F3] border border-[#E4E0D6] rounded-lg p-3">
              <div className="flex items-center justify-between text-[#64748B] mb-1">
                <span className="text-[11px] font-medium">Knowledge Chunks</span>
                <Layers className="w-3.5 h-3.5 text-[#C8892E]" />
              </div>
              <div className="font-sans font-bold text-lg text-[#141C2B]">
                {chunks.length}{' '}
                <span className="text-xs font-normal text-[#64748B]">vectors</span>
              </div>
              <div className="text-[10px] text-[#64748B] font-mono mt-1 truncate">
                Last sync: {lastOfflineSyncTime ? new Date(lastOfflineSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 border-t border-[#EFEBE2] flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  precacheAllDocumentsForUnderground();
                  sounds.playSuccess();
                }}
                className="px-3.5 py-2 bg-[#166534] hover:bg-[#14532D] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <DownloadCloud className="w-3.5 h-3.5 text-[#86EFAC]" />
                <span>Pre-cache All {documents.length} Documents</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  toggleSimulateOffline();
                  sounds.playClick();
                }}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isSimulatedOffline 
                    ? 'bg-[#141C2B] text-white border-[#141C2B]' 
                    : 'bg-[#FAF8F3] hover:bg-[#EFEBE2] text-[#141C2B] border-[#E4E0D6]'
                }`}
              >
                {isSimulatedOffline ? <WifiOff className="w-3.5 h-3.5 text-[#F59E0B]" /> : <Wifi className="w-3.5 h-3.5 text-[#16A34A]" />}
                <span>{isSimulatedOffline ? 'Simulating Underground Pit' : 'Test Underground Disconnect'}</span>
              </button>
            </div>

            <div className="text-[11px] text-[#64748B] font-mono">
              Role: <span className="font-bold text-[#141C2B] uppercase">{currentUser.role}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
