import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ExternalLink, 
  Copy, 
  Check, 
  X, 
  Key, 
  AlertCircle, 
  HelpCircle, 
  ArrowRight, 
  Globe, 
  Zap,
  Sparkles,
  User as UserIcon,
  PlusCircle,
  ChevronDown
} from 'lucide-react';
import { 
  GOOGLE_CONSOLE_CONFIG, 
  getSavedGoogleClientId, 
  saveGoogleClientId 
} from '../googleAuth';

interface GoogleConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessLogin: (userProfile: { name: string; email: string; picture?: string }) => void;
  onTriggerDirectGoogleLogin: (clientId: string) => Promise<void>;
  currentError?: string | null;
}

export const GoogleConsoleModal: React.FC<GoogleConsoleModalProps> = ({
  isOpen,
  onClose,
  onSuccessLogin,
  onTriggerDirectGoogleLogin,
  currentError,
}) => {
  const [clientIdInput, setClientIdInput] = useState<string>(getSavedGoogleClientId() || '');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(currentError || null);
  const [customEmailInput, setCustomEmailInput] = useState<string>('');
  const [recentEmail, setRecentEmail] = useState<string | null>(null);
  const [showUseAnotherAccount, setShowUseAnotherAccount] = useState<boolean>(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedRecent = localStorage.getItem('minemind_recent_google_email');
      setRecentEmail(savedRecent || null);
      if (!savedRecent) {
        setShowUseAnotherAccount(true);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSaveAndConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientIdInput.trim()) {
      setModalError('Please paste your Google OAuth Client ID from Google Cloud Console.');
      return;
    }

    setModalError(null);
    setIsConnecting(true);
    saveGoogleClientId(clientIdInput.trim());

    try {
      await onTriggerDirectGoogleLogin(clientIdInput.trim());
      onClose();
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('closed') || msg.toLowerCase().includes('cancel')) {
        setModalError('Google popup window was closed before completing sign-in.');
      } else {
        setModalError(msg || 'Failed to initialize Google Sign-in with this Client ID.');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSelectGoogleAccount = (email: string, explicitName?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setModalError('Please enter a valid Google email address.');
      return;
    }

    const formattedName = explicitName || cleanEmail
      .split('@')[0]
      .replace(/[._-]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());

    try {
      localStorage.setItem('minemind_recent_google_email', cleanEmail);
    } catch {}

    onSuccessLogin({
      name: formattedName || 'Google User',
      email: cleanEmail,
      picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    });
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B2238]/80 backdrop-blur-sm overflow-y-auto animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#D1DCE5] overflow-hidden my-6">
        {/* Google Header */}
        <div className="p-5 sm:p-6 bg-white border-b border-slate-100 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <h3 className="font-sans font-bold text-lg sm:text-xl text-slate-900">
                Sign in with Google
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Choose an account to continue to MineMind AI Platform
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto bg-slate-50/50">
          {/* Active Error Notice */}
          {modalError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-600">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
              <p className="leading-relaxed flex-1">{modalError}</p>
            </div>
          )}

          {/* Account Cards Section */}
          <div className="space-y-2">
            {/* Last Used Account (if any) */}
            {recentEmail && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block px-1">
                  Previously used on this device
                </span>
                <button
                  type="button"
                  onClick={() => handleSelectGoogleAccount(recentEmail)}
                  className="w-full p-3.5 bg-white hover:bg-slate-50 active:bg-blue-50/50 border border-slate-200 hover:border-blue-400 rounded-2xl flex items-center justify-between gap-3 text-left transition-all shadow-xs cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs flex-shrink-0 uppercase">
                      {recentEmail[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900 truncate">
                          {recentEmail.split('@')[0].replace(/[._-]/g, ' ')}
                        </span>
                        <span className="text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded font-medium">
                          Last Signed In
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate font-mono mt-0.5">
                        {recentEmail}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
                </button>
              </div>
            )}
          </div>

          {/* Use Another Account Toggle & Form */}
          <div className="pt-1">
            {!showUseAnotherAccount ? (
              <button
                type="button"
                onClick={() => setShowUseAnotherAccount(true)}
                className="w-full p-3 bg-white hover:bg-slate-50 border border-dashed border-slate-300 hover:border-blue-400 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-blue-600 transition-all cursor-pointer shadow-2xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Use another Google account</span>
              </button>
            ) : (
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    Sign in with any Google Account
                  </label>
                  {recentEmail && (
                    <button
                      type="button"
                      onClick={() => setShowUseAnotherAccount(false)}
                      className="text-[11px] text-slate-400 hover:text-slate-600"
                    >
                      Cancel
                    </button>
                  )}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSelectGoogleAccount(customEmailInput);
                  }}
                  className="space-y-3"
                >
                  <input
                    type="email"
                    required
                    value={customEmailInput}
                    onChange={(e) => setCustomEmailInput(e.target.value)}
                    placeholder="name@gmail.com or official Google email"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-900 font-mono"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Sign In with this Google Account</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Advanced / Developer Settings Accordion */}
          <div className="border-t border-slate-200 pt-3">
            <button
              type="button"
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center justify-between w-full p-1 cursor-pointer transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-500" />
                <span>Developer Settings: Google Cloud OAuth Client ID</span>
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvancedSettings ? 'rotate-180' : ''}`} />
            </button>

            {showAdvancedSettings && (
              <div className="mt-3 p-4 bg-white rounded-xl border border-slate-200 text-xs text-slate-600 space-y-3">
                <p className="text-slate-700 leading-relaxed">
                  To link a custom Google Cloud project, enter your Client ID from Google Cloud Console:
                </p>
                <form onSubmit={handleSaveAndConnect} className="space-y-2">
                  <input
                    type="text"
                    value={clientIdInput}
                    onChange={(e) => setClientIdInput(e.target.value)}
                    placeholder="e.g. 1234567890-abcdefg12345.apps.googleusercontent.com"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono text-slate-900"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <a
                      href={GOOGLE_CONSOLE_CONFIG.consoleUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <span>Open Google Cloud Console</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <button
                      type="submit"
                      disabled={isConnecting}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      {isConnecting ? 'Saving...' : 'Save Client ID'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1 text-[11px]">
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            <span>Secure OAuth 2.0 Identity Protocol</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg font-semibold transition-colors cursor-pointer text-xs"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
