import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import { Wifi, WifiOff } from 'lucide-react';
import { pwaManager } from '@/lib/pwa.ts';

export default function PWANetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);

  useEffect(() => {
    const handlePWAEvent = (event: any) => {
      try {
        if (event.type === 'offline') {
          setIsOnline(false);
          setShowOfflineAlert(true);
        } else if (event.type === 'online') {
          setIsOnline(true);
          // Hide offline alert after a delay when back online
          setTimeout(() => {
            setShowOfflineAlert(false);
          }, 3000);
        }
      } catch (error) {
        console.error('PWA: Error handling network event:', error);
      }
    };

    try {
      pwaManager.addEventListener(handlePWAEvent);
    } catch (error) {
      console.error('PWA: Error adding network event listener:', error);
    }

    return () => {
      try {
        pwaManager.removeEventListener(handlePWAEvent);
      } catch (error) {
        console.error('PWA: Error removing network event listener:', error);
      }
    };
  }, []);

  if (!showOfflineAlert && isOnline) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:w-80">
      <Alert className={`${
        isOnline 
          ? 'bg-green-50 border-green-200' 
          : 'bg-amber-50 border-amber-200'
      }`}>
        {isOnline ? (
          <Wifi className="h-4 w-4 text-green-600" />
        ) : (
          <WifiOff className="h-4 w-4 text-amber-600" />
        )}
        <AlertDescription>
          <div className="space-y-1">
            <p className={`text-sm font-medium ${
              isOnline ? 'text-green-800' : 'text-amber-800'
            }`}>
              {isOnline ? 'Back Online!' : 'You\'re Offline'}
            </p>
            <p className={`text-xs ${
              isOnline ? 'text-green-700' : 'text-amber-700'
            }`}>
              {isOnline 
                ? 'Your actions have been synced.'
                : 'Some features may be limited. Your actions will sync when connection returns.'
              }
            </p>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}