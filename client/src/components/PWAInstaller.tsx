import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog.tsx';
import { Download, Smartphone, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running on iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if already installed (running in standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                     (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Check if app is already installed (only in top-level browsing contexts)
    if ('getInstalledRelatedApps' in navigator && window.self === window.top) {
      try {
        (navigator as any).getInstalledRelatedApps().then((relatedApps: any[]) => {
          setIsInstalled(relatedApps.length > 0);
        }).catch((error: any) => {
          console.log('PWA: getInstalledRelatedApps not available in this context');
          // Fallback: assume not installed if we can't check
          setIsInstalled(false);
        });
      } catch (error) {
        console.log('PWA: getInstalledRelatedApps not supported in this browsing context');
        setIsInstalled(false);
      }
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show install prompt after a delay if not already installed
      if (!standalone && !iOS) {
        setTimeout(() => {
          setShowInstallPrompt(true);
        }, 5000); // Show after 5 seconds
      }
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('PWA: App was installed');
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isStandalone]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('PWA: User accepted the install prompt');
      } else {
        console.log('PWA: User dismissed the install prompt');
      }
      
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    } catch (error) {
      console.error('PWA: Error during installation:', error);
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    // Don't show again for this session
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Don't show if already installed, in standalone mode, or user dismissed
  if (isInstalled || isStandalone || sessionStorage.getItem('pwa-install-dismissed')) {
    return null;
  }

  return (
    <Dialog open={showInstallPrompt} onOpenChange={setShowInstallPrompt}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-blue-600" />
            Install Jemzy App
          </DialogTitle>
          <DialogDescription>
            Get the full Jemzy experience! Install our app for:
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full" />
              Faster loading and offline access
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full" />
              Push notifications for treasure alerts
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full" />
              Native app experience
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full" />
              Home screen shortcut
            </li>
          </ul>

          {isIOS ? (
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800 mb-2 font-medium">
                To install on iOS:
              </p>
              <ol className="text-xs text-blue-700 space-y-1">
                <li>1. Tap the Share button in Safari</li>
                <li>2. Scroll down and tap "Add to Home Screen"</li>
                <li>3. Tap "Add" to install Jemzy</li>
              </ol>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button 
                onClick={handleInstallClick}
                disabled={!deferredPrompt}
                className="flex-1 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Install App
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleDismiss}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
          
          {!isIOS && (
            <Button 
              variant="ghost" 
              onClick={handleDismiss}
              className="w-full text-sm"
            >
              Maybe later
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}