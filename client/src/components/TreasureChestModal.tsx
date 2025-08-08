import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Loader2, MapPin, Clock, Coins } from 'lucide-react';
import { TreasureChest } from '@/types/treasure.ts';
import treasureIcon from '@assets/Treasure_1752016786995.png';
import coinIcon from '@assets/Coins_1752104970427.png';

interface TreasureChestModalProps {
  chest: TreasureChest | null;
  isOpen: boolean;
  onClose: () => void;
  userLocation: { lat: number; lng: number } | null;
  onCollect: (chest: TreasureChest) => Promise<void>;
}

export const TreasureChestModal = ({ 
  chest, 
  isOpen, 
  onClose, 
  userLocation,
  onCollect 
}: TreasureChestModalProps) => {
  const [isCollecting, setIsCollecting] = useState(false);

  if (!chest) return null;

  const handleCollect = async () => {
    setIsCollecting(true);
    try {
      await onCollect(chest);
      onClose();
    } catch (error) {
      console.error('Error collecting treasure chest:', error);
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
      parseFloat(chest.latitude), 
      parseFloat(chest.longitude)
    );
    return distance <= 30.48; // 100 feet in meters
  };

  const getTimeLeft = () => {
    const now = new Date();
    const expiresAt = new Date(chest.expiresAt);
    const timeLeft = Math.max(0, (expiresAt.getTime() - now.getTime()) / 1000);
    const hoursLeft = Math.floor(timeLeft / 3600);
    const minutesLeft = Math.floor((timeLeft % 3600) / 60);
    
    if (hoursLeft > 0) {
      return `${hoursLeft}h ${minutesLeft}m`;
    }
    return `${minutesLeft}m`;
  };

  const getDifficultyInfo = () => {
    const difficulty = chest.difficulty;
    switch (difficulty) {
      case 'easy':
        return { 
          label: 'Easy', 
          color: 'text-green-600 bg-green-100',
          backgroundColorClass: 'bg-green-500/20',
          description: 'Common treasure - 6 hours to collect',
          urgency: 'low'
        };
      case 'medium':
        return { 
          label: 'Medium', 
          color: 'text-blue-600 bg-blue-100',
          backgroundColorClass: 'bg-blue-500/20',
          description: 'Decent treasure - 4 hours to collect',
          urgency: 'medium'
        };
      case 'hard':
        return { 
          label: 'Hard', 
          color: 'text-orange-600 bg-orange-100',
          backgroundColorClass: 'bg-orange-500/20',
          description: 'Valuable treasure - 2 hours to collect',
          urgency: 'high'
        };
      case 'very_hard':
        return { 
          label: 'Very Hard', 
          color: 'text-red-600 bg-red-100',
          backgroundColorClass: 'bg-red-500/20',
          description: 'Rare treasure - 1 hour to collect',
          urgency: 'very_high'
        };
      case 'extreme':
        return { 
          label: 'Extreme', 
          color: 'text-purple-600 bg-purple-100',
          backgroundColorClass: 'bg-purple-500/20',
          description: 'Legendary treasure - 30 minutes to collect',
          urgency: 'extreme'
        };
      default:
        return { 
          label: 'Unknown', 
          color: 'text-gray-600 bg-gray-100',
          backgroundColorClass: 'bg-gray-500/20',
          description: 'Mystery treasure',
          urgency: 'low'
        };
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <img 
              src={treasureIcon} 
              alt="Treasure Chest" 
              className="w-8 h-8 object-contain"
            />
            Treasure Chest Discovered!
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Treasure chest image */}
          <div className="flex justify-center">
            <div className={`w-32 h-32 ${getDifficultyInfo().backgroundColorClass} rounded-full flex items-center justify-center shadow-lg p-4`}>
              <img 
                src={treasureIcon} 
                alt="Treasure Chest" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Chest details */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                Expires in {getTimeLeft()}
              </span>
            </div>
          </div>

          {/* Difficulty Level and Reward Info */}
          <div className="space-y-3">
            {/* Difficulty Badge */}
            <div className="flex justify-center">
              <div className={`px-3 py-1 rounded-full text-sm font-semibold ${getDifficultyInfo().color}`}>
                {getDifficultyInfo().label} Difficulty
              </div>
            </div>
            
            {/* Coin Reward */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-2xl font-bold text-yellow-600">
                <img src={coinIcon} alt="Coin" className="w-6 h-6" />
                {chest.coinReward} coins
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {getDifficultyInfo().description}
              </p>
            </div>
          </div>

          {/* Location requirement */}
          {!userLocation ? (
            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-red-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-red-800">Location Required</p>
                  <p className="text-red-600">
                    Please enable location access to collect treasure chests.
                  </p>
                </div>
              </div>
            </div>
          ) : !isWithinRange() && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-blue-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-800">Get Closer!</p>
                  <p className="text-blue-600">
                    You must be within 100 feet of the treasure chest to collect it.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Collect button - only show when in range and location is available */}
          {userLocation && isWithinRange() && (
            <Button 
              onClick={handleCollect} 
              disabled={isCollecting}
              className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-semibold py-3"
            >
              {isCollecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Collecting...
                </>
              ) : (
                <>
                  <img src={coinIcon} alt="Coin" className="w-4 h-4 mr-2" />
                  Collect Treasure
                </>
              )}
            </Button>
          )}

          {/* Cancel button */}
          <Button 
            variant="outline" 
            onClick={onClose}
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};