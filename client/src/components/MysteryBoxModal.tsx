import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Clock, MapPin, Coins, Zap, Flame } from 'lucide-react';
import mysteryBoxIcon from '@assets/MysteryBox_1752339493995.png';
import { useMysteryBoxCollectionSound } from '@/hooks/useMysteryBoxCollectionSound.ts';

interface MysteryBoxModalProps {
  box: {
    id: string;
    latitude: string;
    longitude: string;
    coinReward: number;
    xpReward: number;
    lanternReward: number;
    rarity: string;
    spawnedAt: string;
    expiresAt: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  userLocation: { lat: number; lng: number } | null;
  onCollect: (box: any) => Promise<any>;
}

export const MysteryBoxModal = ({ 
  box, 
  isOpen, 
  onClose, 
  userLocation,
  onCollect 
}: MysteryBoxModalProps) => {
  const [isCollecting, setIsCollecting] = useState(false);
  const playMysteryBoxCollectionSound = useMysteryBoxCollectionSound();

  if (!box) return null;

  const handleCollect = async () => {
    setIsCollecting(true);
    try {
      const result = await onCollect(box);
      if (result && result.success) {
        // Play the joyful collection sound
        playMysteryBoxCollectionSound();
      }
      onClose();
    } catch (error) {
      console.error('Error collecting mystery box:', error);
    } finally {
      setIsCollecting(false);
    }
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lng2-lng1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  const isWithinRange = () => {
    if (!userLocation) return false;
    const distance = calculateDistance(
      userLocation.lat, 
      userLocation.lng, 
      parseFloat(box.latitude), 
      parseFloat(box.longitude)
    );
    return distance <= 30.48; // 100 feet in meters
  };

  const getTimeLeft = () => {
    const now = new Date();
    const expiresAt = new Date(box.expiresAt);
    const timeLeft = Math.max(0, (expiresAt.getTime() - now.getTime()) / 1000);
    const hoursLeft = Math.floor(timeLeft / 3600);
    const minutesLeft = Math.floor((timeLeft % 3600) / 60);
    
    if (hoursLeft > 0) {
      return `${hoursLeft}h ${minutesLeft}m`;
    }
    return `${minutesLeft}m`;
  };

  const getRarityInfo = () => {
    const rarity = box.rarity;
    switch (rarity) {
      case 'common':
        return { 
          label: 'Common', 
          color: 'text-gray-600 bg-gray-100',
          backgroundColorClass: 'bg-gray-500/20',
          description: 'Common mystery box - multiple rewards',
          urgency: 'low'
        };
      case 'rare':
        return { 
          label: 'Rare', 
          color: 'text-blue-600 bg-blue-100',
          backgroundColorClass: 'bg-blue-500/20',
          description: 'Rare mystery box - better rewards',
          urgency: 'medium'
        };
      case 'epic':
        return { 
          label: 'Epic', 
          color: 'text-purple-600 bg-purple-100',
          backgroundColorClass: 'bg-purple-500/20',
          description: 'Epic mystery box',
          urgency: 'high'
        };
      case 'legendary':
        return { 
          label: 'Legendary', 
          color: 'text-orange-600 bg-orange-100',
          backgroundColorClass: 'bg-orange-500/20',
          description: 'Legendary mystery box - maximum rewards!',
          urgency: 'urgent'
        };
      default:
        return { 
          label: 'Mystery', 
          color: 'text-gray-600 bg-gray-100',
          backgroundColorClass: 'bg-gray-500/20',
          description: 'Mystery box with multiple rewards',
          urgency: 'low'
        };
    }
  };

  const rarityInfo = getRarityInfo();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95%] max-w-md mx-auto rounded-xl bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold text-gray-900 dark:text-white">
            Mystery Box Discovered!
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Mystery box image */}
          <div className="flex justify-center">
            <div className={`p-4 rounded-full ${rarityInfo.backgroundColorClass}`}>
              <img 
                src={mysteryBoxIcon} 
                alt="Mystery Box" 
                className="w-16 h-16 object-contain"
              />
            </div>
          </div>

          {/* Rarity badge */}
          <div className="flex justify-center">
            <Badge className={`${rarityInfo.color} px-3 py-1 text-sm font-semibold rounded-full`}>
              {rarityInfo.label}
            </Badge>
          </div>

          {/* Mystery box information - show different content based on range */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
            {isWithinRange() ? (
              // In range - show collection interface
              <>
                <h3 className="text-center font-semibold text-gray-900 dark:text-white mb-3">
                  Ready to Collect!
                </h3>
                
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2 text-center">
                  <p>You're within range! This {rarityInfo.label.toLowerCase()} mystery box contains:</p>
                  
                  <div className="grid grid-cols-3 gap-4 py-2">
                    <div className="flex flex-col items-center space-y-1">
                      <Coins className="w-5 h-5 text-yellow-500" />
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {box.coinReward}
                      </span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">Coins</span>
                    </div>
                    <div className="flex flex-col items-center space-y-1">
                      <Zap className="w-5 h-5 text-blue-500" />
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {box.xpReward}
                      </span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">XP</span>
                    </div>
                    <div className="flex flex-col items-center space-y-1">
                      <Flame className="w-5 h-5 text-orange-500" />
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {box.lanternReward}
                      </span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">Lanterns</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              // Out of range - show informational content
              <>
                <h3 className="text-center font-semibold text-gray-900 dark:text-white mb-3">
                  What's in a Mystery Box?
                </h3>
                
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2 text-center">
                  <p>Mystery boxes contain surprise rewards that can include:</p>
                  
                  <div className="grid grid-cols-3 gap-4 py-2">
                    <div className="flex flex-col items-center space-y-1">
                      <Coins className="w-5 h-5 text-yellow-500" />
                      <span className="text-xs text-gray-600 dark:text-gray-400">Coins</span>
                    </div>
                    <div className="flex flex-col items-center space-y-1">
                      <Zap className="w-5 h-5 text-blue-500" />
                      <span className="text-xs text-gray-600 dark:text-gray-400">XP</span>
                    </div>
                    <div className="flex flex-col items-center space-y-1">
                      <Flame className="w-5 h-5 text-orange-500" />
                      <span className="text-xs text-gray-600 dark:text-gray-400">Lanterns</span>
                    </div>
                  </div>
                  
                  <p className="italic">The higher the rarity, the better the rewards!</p>

                </div>
              </>
            )}
          </div>

          {/* Time and location info */}
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Expires in: {getTimeLeft()}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>Location: {parseFloat(box.latitude).toFixed(6)}, {parseFloat(box.longitude).toFixed(6)}</span>
            </div>
          </div>

          {/* Collection status */}
          <div className="text-center">
            {isWithinRange() ? (
              <div className="space-y-3">
                <p className="text-green-600 dark:text-green-400 text-sm font-medium">
                  ✓ You are within collection range!
                </p>
                <Button 
                  onClick={handleCollect}
                  disabled={isCollecting}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-2"
                >
                  {isCollecting ? 'Opening...' : `Collect ${rarityInfo.label} Box!`}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-red-600 dark:text-red-400 text-sm font-medium">
                  You need to be within 100 feet to collect this mystery box
                </p>

                <Button variant="outline" onClick={onClose} className="w-full">
                  Got it!
                </Button>
              </div>
            )}
          </div>


        </div>
      </DialogContent>
    </Dialog>
  );
};