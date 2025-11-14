'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui';
import { Download, X, CheckCircle2, Smartphone, ExternalLink } from 'lucide-react';
import { setupInstallPrompt, showInstallPrompt, isInstalled, getPWAStatus } from '@/lib/pwa';

export function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showManualInstructions, setShowManualInstructions] = useState(false);
  const [browserInfo, setBrowserInfo] = useState<ReturnType<typeof getPWAStatus>['browser'] | null>(null);

  useEffect(() => {
    // Check if already installed
    const status = getPWAStatus();
    setIsInstalled(status.isInstalled);
    setBrowserInfo(status.browser);

    if (status.isInstalled) {
      return;
    }

    // Check if user previously dismissed
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    // For DuckDuckGo or browsers without install prompt support, show manual instructions
    if (status.browser.isDuckDuckGo || (!status.isInstallable && status.isSupported)) {
      setShowManualInstructions(true);
      setShowPrompt(true);
      return;
    }

    // Setup install prompt listener for supported browsers
    const cleanup = setupInstallPrompt((available) => {
      if (available && !status.isInstalled) {
        setShowPrompt(true);
      }
    });

    return cleanup;
  }, []);

  const handleInstall = async () => {
    const installed = await showInstallPrompt();
    if (installed) {
      setShowPrompt(false);
      setIsInstalled(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setIsDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
    
    // Re-enable prompt after 7 days
    setTimeout(() => {
      localStorage.removeItem('pwa-install-dismissed');
    }, 7 * 24 * 60 * 60 * 1000);
  };

  // Don't show if installed or dismissed
  if (isInstalled || isDismissed || !showPrompt) {
    return null;
  }

  // Show manual instructions for DuckDuckGo or unsupported browsers
  if (showManualInstructions && browserInfo) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-lg p-4 shadow-xl z-50 animate-in slide-in-from-bottom-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Smartphone className="h-5 w-5 text-blue-400" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white mb-1">Install Checkly</h3>
            <p className="text-sm text-slate-400 mb-3">
              {browserInfo.isDuckDuckGo 
                ? "DuckDuckGo browser doesn't support automatic installation. Follow these steps:"
                : "Add Checkly to your home screen manually:"}
            </p>
            
            {browserInfo.isIOS ? (
              <div className="space-y-2 mb-3 text-sm text-slate-300">
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-blue-400">1.</span>
                  <span>Tap the <strong>Share</strong> button <ExternalLink className="inline h-3 w-3" /> at the bottom</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-blue-400">2.</span>
                  <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-blue-400">3.</span>
                  <span>Tap <strong>"Add"</strong> to confirm</span>
                </div>
              </div>
            ) : browserInfo.isAndroid ? (
              <div className="space-y-2 mb-3 text-sm text-slate-300">
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-blue-400">1.</span>
                  <span>Tap the <strong>Menu</strong> button (3 dots) in the top-right</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-blue-400">2.</span>
                  <span>Tap <strong>"Add to Home Screen"</strong> or <strong>"Install App"</strong></span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-blue-400">3.</span>
                  <span>Tap <strong>"Install"</strong> or <strong>"Add"</strong> to confirm</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2 mb-3 text-sm text-slate-300">
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-blue-400">1.</span>
                  <span>Look for the <strong>Install</strong> icon in your browser's address bar</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-blue-400">2.</span>
                  <span>Or use your browser's menu: <strong>File → Install App</strong></span>
                </div>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button 
                onClick={handleDismiss} 
                variant="ghost" 
                size="sm"
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4 mr-2" />
                Got it
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Standard install prompt for supported browsers
  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-lg p-4 shadow-xl z-50 animate-in slide-in-from-bottom-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
            <Download className="h-5 w-5 text-green-400" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white mb-1">Install Checkly</h3>
          <p className="text-sm text-slate-400 mb-3">
            Add Checkly to your home screen for quick access, offline support, and push notifications.
          </p>
          <div className="flex gap-2">
            <Button 
              onClick={handleInstall} 
              size="sm"
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              <Download className="h-4 w-4 mr-2" />
              Install
            </Button>
            <Button 
              onClick={handleDismiss} 
              variant="ghost" 
              size="sm"
              className="text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Component to show when PWA is installed
 */
export function PWAInstalledBadge() {
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setInstalled(isInstalled());
  }, []);

  if (!installed) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 bg-green-500/20 border border-green-500/30 rounded-lg px-3 py-2 flex items-center gap-2 text-sm text-green-400 z-50">
      <CheckCircle2 className="h-4 w-4" />
      <span>App Installed</span>
    </div>
  );
}

