import { useState } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { X, MapPin, Coins, Lock, Unlock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast.ts';
import { apiRequest } from '@/lib/queryClient.ts';

interface VideoUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: any;
  userDistance: number;
  userCoins: number;
  onUnlock: () => void;
}

export default function VideoUnlockModal({ 
  isOpen, 
  onClose, 
  video, 
  userDistance, 
  userCoins, 
  onUnlock 
}: VideoUnlockModalProps) {
  const [isUnlocking, setIsUnlocking] = useState(false);
  const { toast } = useToast();

  if (!isOpen) return null;

  const formatDistance = (distance: number) => {
    if (distance < 1000) {
      return `${Math.round(distance)}ft`;
    } else {
      return `${(distance * 3.28084 / 5280).toFixed(1)}mi`;
    }
  };

  const handleRemoteUnlock = async () => {
    if (userCoins < 1) {
      toast({
        title: "Not enough coins",
        description: "You need at least 1 coin to unlock this video remotely",
        variant: "destructive"
      });
      return;
    }

    setIsUnlocking(true);
    try {
      await apiRequest(`/api/videos/${video.id}/remote-unlock`, 'POST');
      toast({
        title: "Video unlocked!",
        description: "You spent 1 coin to unlock this video remotely"
      });
      onUnlock();
      onClose();
    } catch (error) {
      toast({
        title: "Unlock failed",
        description: "Failed to unlock video. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUnlocking(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[80] p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 relative">
        {/* Close Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </Button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Video Locked</h2>
          <p className="text-gray-600">
            You are currently <span className="font-semibold text-red-600">{formatDistance(userDistance)}</span> away from this video
          </p>
        </div>

        {/* Video Preview */}
        <div className="bg-gray-100 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <div className="w-20 h-14 bg-gray-900 rounded-lg overflow-hidden flex-shrink-0">
              {video.bunnyVideoId && (
                <img 
                  src={`https://vz-7c674c55-8ff.b-cdn.net/${video.bunnyVideoId}/thumbnail.jpg`}
                  alt="Video thumbnail"
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 line-clamp-2 mb-1">
                {video.title}
              </h3>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span className="px-2 py-1 bg-gray-200 rounded-full text-xs">
                  {video.category}
                </span>
                <div className="flex items-center">
                  <MapPin className="w-3 h-3 mr-1" />
                  <span className="text-xs">{formatDistance(userDistance)} away</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Unlock Options */}
        <div className="space-y-4">
          {/* Option 1: Travel to location */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              <h3 className="font-medium text-gray-900">Travel to Location</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Get within 100ft of the video location to unlock it for free
            </p>
            <Button variant="outline" onClick={onClose} className="w-full">
              View on Map
            </Button>
          </div>

          {/* Option 2: Pay to unlock remotely */}
          <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
            <div className="flex items-center space-x-3 mb-2">
              <Unlock className="w-5 h-5 text-purple-600" />
              <h3 className="font-medium text-gray-900">Unlock Remotely</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Spend 1 coin to watch this video from anywhere
            </p>
            
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2 text-sm">
                <Coins className="w-4 h-4 text-yellow-600" />
                <span className="text-gray-600">Your coins:</span>
                <span className="font-semibold text-gray-900">{userCoins}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">Cost:</span>
                <span className="font-semibold text-purple-600 ml-1">1 coin</span>
              </div>
            </div>

            <Button 
              onClick={handleRemoteUnlock}
              disabled={userCoins < 1 || isUnlocking}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {isUnlocking ? (
                "Unlocking..."
              ) : userCoins < 1 ? (
                "Not enough coins"
              ) : (
                "Unlock for 1 Coin"
              )}
            </Button>

            {userCoins < 1 && (
              <p className="text-xs text-red-600 mt-2 text-center">
                You need more coins to unlock remotely
              </p>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-800 text-center">
            Videos in Jemzy are unlocked when you are physically close to their location. 
            This creates unique location-based experiences!
          </p>
        </div>
      </div>
    </div>
  );
}