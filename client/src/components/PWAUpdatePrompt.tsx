import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import { RefreshCw, X } from 'lucide-react';
import { pwaManager } from '@/lib/pwa.ts';

export default function PWAUpdatePrompt() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const handlePWAEvent = (event: any) => {
      try {
        if (event.type === 'updateAvailable') {
          setShowUpdate(true);
        }
      } catch (error) {
        console.error('PWA: Error handling update event:', error);
      }
    };

    try {
      pwaManager.addEventListener(handlePWAEvent);
    } catch (error) {
      console.error('PWA: Error adding event listener:', error);
    }

    return () => {
      try {
        pwaManager.removeEventListener(handlePWAEvent);
      } catch (error) {
        console.error('PWA: Error removing event listener:', error);
      }
    };
  }, []);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await pwaManager.activateUpdate();
    } catch (error) {
      console.error('PWA: Update failed:', error);
      setIsUpdating(false);
    }
  };

  const handleDismiss = () => {
    setShowUpdate(false);
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:w-96">
      <Alert className="bg-blue-50 border-blue-200">
        <RefreshCw className="h-4 w-4 text-blue-600" />
        <AlertDescription className="pr-8">
          <div className="space-y-2">
            <p className="text-sm font-medium text-blue-800">
              New version available!
            </p>
            <p className="text-xs text-blue-700">
              Update now to get the latest features and improvements.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleUpdate}
                disabled={isUpdating}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Now'
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDismiss}
                className="text-blue-600 border-blue-200"
              >
                Later
              </Button>
            </div>
          </div>
        </AlertDescription>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDismiss}
          className="absolute top-2 right-2 h-6 w-6 p-0 text-blue-600"
        >
          <X className="h-3 w-3" />
        </Button>
      </Alert>
    </div>
  );
}