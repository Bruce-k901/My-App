'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui';
import { Download, Smartphone, CheckCircle2, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { showInstallPrompt, isInstalled, getPWAStatus } from '@/lib/pwa';

export function PWAInstallSection() {
  const [status, setStatus] = useState<ReturnType<typeof getPWAStatus> | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const currentStatus = getPWAStatus();
    setStatus(currentStatus);
  }, []);

  if (!status) {
    return null;
  }

  const handleInstall = async () => {
    setInstalling(true);
    try {
      const installed = await showInstallPrompt();
      if (installed) {
        // Refresh status
        setStatus(getPWAStatus());
      }
    } catch (error) {
      console.error('Install error:', error);
    } finally {
      setInstalling(false);
    }
  };

  // If already installed, show success message
  if (status.isInstalled) {
    return (
      <div className="p-4 rounded border border-green-500/30 bg-green-500/10">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-white">App Installed</p>
            <p className="text-sm text-slate-400">Checkly is installed on your device.</p>
          </div>
        </div>
      </div>
    );
  }

  const { browser } = status;
  const needsManualInstall = browser.isDuckDuckGo || (!status.isInstallable && status.isSupported);

  return (
    <div className="p-4 rounded border border-neutral-800 bg-[#0f1220]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Smartphone className="h-5 w-5 text-blue-400" />
            <h3 className="font-medium text-white">Install Checkly App</h3>
          </div>
          <p className="text-sm text-slate-400 mb-3">
            Install Checkly to your home screen for quick access, offline support, and push notifications.
          </p>

          {needsManualInstall ? (
            <div className="space-y-3">
              <Button
                onClick={() => setShowInstructions(!showInstructions)}
                variant="outline"
                size="sm"
                className="w-full justify-between"
              >
                <span>Show Installation Instructions</span>
                {showInstructions ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>

              {showInstructions && (
                <div className="mt-3 p-3 rounded bg-slate-900/50 border border-slate-700">
                  {browser.isIOS ? (
                    <div className="space-y-2 text-sm text-slate-300">
                      <p className="font-semibold text-white mb-2">iOS Installation Steps:</p>
                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-blue-400">1.</span>
                        <span>Tap the <strong>Share</strong> button <ExternalLink className="inline h-3 w-3" /> at the bottom of Safari</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-blue-400">2.</span>
                        <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-blue-400">3.</span>
                        <span>Tap <strong>"Add"</strong> in the top-right corner</span>
                      </div>
                    </div>
                  ) : browser.isAndroid ? (
                    <div className="space-y-2 text-sm text-slate-300">
                      <p className="font-semibold text-white mb-2">Android Installation Steps:</p>
                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-blue-400">1.</span>
                        <span>Tap the <strong>Menu</strong> button (3 dots) in the top-right corner</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-blue-400">2.</span>
                        <span>Tap <strong>"Add to Home Screen"</strong> or <strong>"Install App"</strong></span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-blue-400">3.</span>
                        <span>Tap <strong>"Install"</strong> or <strong>"Add"</strong> to confirm</span>
                      </div>
                      {browser.isDuckDuckGo && (
                        <p className="text-xs text-slate-400 mt-2 italic">
                          Note: DuckDuckGo browser requires manual installation. The app will work the same once installed.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 text-sm text-slate-300">
                      <p className="font-semibold text-white mb-2">Desktop Installation Steps:</p>
                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-blue-400">1.</span>
                        <span>Look for the <strong>Install</strong> icon in your browser's address bar</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-blue-400">2.</span>
                        <span>Or use your browser's menu: <strong>File → Install App</strong></span>
                      </div>
                      {browser.isDuckDuckGo && (
                        <p className="text-xs text-slate-400 mt-2 italic">
                          Note: DuckDuckGo browser doesn't support automatic installation. Use your browser's menu to add to home screen.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <Button
              onClick={handleInstall}
              disabled={installing}
              className="bg-green-500 hover:bg-green-600 text-white"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              {installing ? 'Installing...' : 'Install App'}
            </Button>
          )}
        </div>
      </div>

      {status.isSupported && (
        <p className="text-xs text-slate-500 mt-3">
          ✓ PWA features supported • Offline access • Push notifications ready
        </p>
      )}
    </div>
  );
}

